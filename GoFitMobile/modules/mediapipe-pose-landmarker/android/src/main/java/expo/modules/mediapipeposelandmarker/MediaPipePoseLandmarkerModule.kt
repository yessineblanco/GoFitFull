package expo.modules.mediapipeposelandmarker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.ByteBufferExtractor
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.components.containers.Landmark
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenter
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenterResult
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.util.Optional

class MediaPipePoseLandmarkerModule : Module() {
  @Volatile
  private var poseLandmarker: PoseLandmarker? = null

  @Volatile
  private var imageSegmenter: ImageSegmenter? = null

  override fun definition() = ModuleDefinition {
    Name("MediaPipePoseLandmarker")

    AsyncFunction("analyzePoseFromImage") { uri: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is not available")
      val bitmap = decodeBitmap(context, uri)
      val startedAt = System.nanoTime()
      val result = getPoseLandmarker(context).detect(BitmapImageBuilder(bitmap).build())
      val inferenceMs = (System.nanoTime() - startedAt) / 1_000_000.0
      val landmarks = result.landmarks().firstOrNull().orEmpty()
      val worldLandmarks = result.worldLandmarks().firstOrNull().orEmpty()

      mapOf(
        "imageWidth" to bitmap.width,
        "imageHeight" to bitmap.height,
        "landmarks" to landmarks.map(::serializeNormalizedLandmark),
        "worldLandmarks" to worldLandmarks.map(::serializeWorldLandmark),
        "inferenceMs" to inferenceMs,
        "poseCount" to result.landmarks().size
      )
    }

    AsyncFunction("analyzeSegmentationFromImage") { uri: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is not available")
      val bitmap = decodeBitmap(context, uri)
      val mpImage = BitmapImageBuilder(bitmap).build()
      val segmentationOptions = ImageSegmenter.SegmentationOptions.builder()
        .setOutputWidth(SEGMENTATION_OUTPUT_SIZE)
        .setOutputHeight(SEGMENTATION_OUTPUT_SIZE)
        .build()
      val segmenter = getImageSegmenter(context)
      val startedAt = System.nanoTime()
      val result = segmenter.segment(mpImage, segmentationOptions)
      val inferenceMs = (System.nanoTime() - startedAt) / 1_000_000.0

      serializeSegmentationResult(bitmap, result, segmenter.labels, inferenceMs)
    }
  }

  @Synchronized
  private fun getPoseLandmarker(context: Context): PoseLandmarker {
    poseLandmarker?.let { return it }

    val baseOptions = BaseOptions.builder()
      .setModelAssetPath(MODEL_ASSET_PATH)
      .build()
    val options = PoseLandmarker.PoseLandmarkerOptions.builder()
      .setBaseOptions(baseOptions)
      .setRunningMode(RunningMode.IMAGE)
      .setNumPoses(1)
      .setMinPoseDetectionConfidence(0.35f)
      .setMinPosePresenceConfidence(0.35f)
      .setMinTrackingConfidence(0.35f)
      .setOutputSegmentationMasks(false)
      .build()

    return PoseLandmarker.createFromOptions(context, options).also {
      poseLandmarker = it
    }
  }

  @Synchronized
  private fun getImageSegmenter(context: Context): ImageSegmenter {
    imageSegmenter?.let { return it }

    val baseOptions = BaseOptions.builder()
      .setModelAssetPath(SEGMENTER_MODEL_ASSET_PATH)
      .build()
    val options = ImageSegmenter.ImageSegmenterOptions.builder()
      .setBaseOptions(baseOptions)
      .setRunningMode(RunningMode.IMAGE)
      .setOutputConfidenceMasks(true)
      .setOutputCategoryMask(true)
      .build()

    return ImageSegmenter.createFromOptions(context, options).also {
      imageSegmenter = it
    }
  }

  private fun decodeBitmap(context: Context, imageUri: String): Bitmap {
    val uri = Uri.parse(imageUri)
    val options = BitmapFactory.Options().apply {
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    val rawBitmap = openImageInputStream(context, imageUri, uri).use { inputStream ->
      BitmapFactory.decodeStream(inputStream, null, options)
    } ?: throw IllegalArgumentException("Unable to decode image: $imageUri")

    val orientation = openImageInputStream(context, imageUri, uri).use { inputStream ->
      ExifInterface(inputStream).getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL
      )
    }

    val rotatedBitmap = applyExifOrientation(rawBitmap, orientation)
    return if (rotatedBitmap.config == Bitmap.Config.ARGB_8888) {
      rotatedBitmap
    } else {
      rotatedBitmap.copy(Bitmap.Config.ARGB_8888, false)
    }
  }

  private fun openImageInputStream(context: Context, imageUri: String, uri: Uri) =
    when {
      uri.scheme == null -> FileInputStream(imageUri)
      uri.scheme == "file" -> FileInputStream(requireNotNull(uri.path) { "File URI path is missing" })
      else -> context.contentResolver.openInputStream(uri)
        ?: throw IllegalArgumentException("Unable to open image URI: $imageUri")
    }

  private fun applyExifOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.postRotate(90f)
        matrix.preScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.postRotate(270f)
        matrix.preScale(-1f, 1f)
      }
      else -> return bitmap
    }

    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  private fun serializeNormalizedLandmark(landmark: NormalizedLandmark) = mapOf(
    "x" to landmark.x(),
    "y" to landmark.y(),
    "z" to landmark.z(),
    "visibility" to optionalFloat(landmark.visibility()),
    "presence" to optionalFloat(landmark.presence())
  )

  private fun serializeWorldLandmark(landmark: Landmark) = mapOf(
    "x" to landmark.x(),
    "y" to landmark.y(),
    "z" to landmark.z(),
    "visibility" to optionalFloat(landmark.visibility()),
    "presence" to optionalFloat(landmark.presence())
  )

  private fun serializeSegmentationResult(
    bitmap: Bitmap,
    result: ImageSegmenterResult,
    labels: List<String>,
    inferenceMs: Double,
  ): Map<String, Any?> {
    val confidenceMasks = result.confidenceMasks().orElse(emptyList()).map { mask ->
      serializeImageMask(mask, MPImage.IMAGE_FORMAT_VEC32F1)
    }
    val categoryMask = result.categoryMask()
      .map { mask -> serializeImageMask(mask, MPImage.IMAGE_FORMAT_ALPHA) }
      .orElse(null)

    return mapOf(
      "imageWidth" to bitmap.width,
      "imageHeight" to bitmap.height,
      "labels" to labels,
      "qualityScores" to result.qualityScores(),
      "confidenceMasks" to confidenceMasks,
      "categoryMask" to categoryMask,
      "inferenceMs" to inferenceMs,
    )
  }

  private fun serializeImageMask(mask: MPImage, imageFormat: Int): Map<String, Any> {
    val buffer = ByteBufferExtractor.extract(mask, imageFormat)
    val bytes = byteBufferToByteArray(buffer)
    return mapOf(
      "width" to mask.width,
      "height" to mask.height,
      "valuesBase64" to Base64.encodeToString(bytes, Base64.NO_WRAP),
    )
  }

  private fun byteBufferToByteArray(buffer: ByteBuffer): ByteArray {
    val copy = buffer.duplicate()
    copy.rewind()
    val bytes = ByteArray(copy.remaining())
    copy.get(bytes)
    return bytes
  }

  private fun optionalFloat(value: Optional<Float>) = if (value.isPresent) value.get() else null

  companion object {
    private const val MODEL_ASSET_PATH = "pose_landmarker_full.task"
    private const val SEGMENTER_MODEL_ASSET_PATH = "selfie_segmenter.tflite"
    private const val SEGMENTATION_OUTPUT_SIZE = 256
  }
}
