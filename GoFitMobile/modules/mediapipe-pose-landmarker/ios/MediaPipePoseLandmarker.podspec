Pod::Spec.new do |s|
  s.name           = 'MediaPipePoseLandmarker'
  s.version        = '1.0.0'
  s.summary        = 'GoFit MediaPipe Pose Landmarker bridge'
  s.description    = 'Expo native module wrapper for MediaPipe Pose Landmarker used by GoFit body measurement analysis.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
