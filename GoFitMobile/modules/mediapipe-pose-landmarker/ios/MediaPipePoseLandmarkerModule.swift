import ExpoModulesCore

public class MediaPipePoseLandmarkerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MediaPipePoseLandmarker")

    AsyncFunction("analyzePoseFromImage") { (uri: String) in
      throw NSError(
        domain: "MediaPipePoseLandmarker",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "MediaPipe Pose Landmarker iOS bridge is not implemented yet for \(uri)"]
      )
    }
  }
}
