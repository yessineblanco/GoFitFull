package expo.modules.mediapipeposelandmarker

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.components.containers.Landmark
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.FileInputStream
import java.util.Optional

class MediaPipePoseLandmarkerModule : Module() {
  @Volatile
  private var poseLandmarker: PoseLandmarker? = null

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

  private fun optionalFloat(value: Optional<Float>) = if (value.isPresent) value.get() else null

  companion object {
    private const val MODEL_ASSET_PATH = "pose_landmarker_full.task"
  }
}
