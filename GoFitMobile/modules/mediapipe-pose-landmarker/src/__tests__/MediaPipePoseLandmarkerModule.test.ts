describe('MediaPipePoseLandmarker module wrapper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.dontMock('expo');
  });

  test('reports unavailable and throws when the native module is missing', async () => {
    jest.doMock('expo', () => ({
      NativeModule: class NativeModule {},
      requireOptionalNativeModule: jest.fn(() => null),
    }));

    const mediaPipeModule = require('../MediaPipePoseLandmarkerModule');

    expect(mediaPipeModule.isMediaPipePoseLandmarkerAvailable).toBe(false);
    await expect(mediaPipeModule.default.analyzePoseFromImage('file://front.jpg')).rejects.toThrow(
      'MediaPipePoseLandmarker native module is unavailable',
    );
    await expect(mediaPipeModule.default.analyzeSegmentationFromImage('file://front.jpg')).rejects.toThrow(
      'MediaPipePoseLandmarker native module is unavailable',
    );
  });

  test('delegates pose and segmentation analysis to the native module when available', async () => {
    const poseResult = {
      imageWidth: 100,
      imageHeight: 200,
      landmarks: [{ x: 0.5, y: 0.25, visibility: 0.9 }],
      inferenceMs: 12,
    };
    const segmentationResult = {
      imageWidth: 100,
      imageHeight: 200,
      labels: ['background', 'person'],
    };
    const nativeModule = {
      analyzePoseFromImage: jest.fn().mockResolvedValue(poseResult),
      analyzeSegmentationFromImage: jest.fn().mockResolvedValue(segmentationResult),
    };

    jest.doMock('expo', () => ({
      NativeModule: class NativeModule {},
      requireOptionalNativeModule: jest.fn(() => nativeModule),
    }));

    const mediaPipeModule = require('../MediaPipePoseLandmarkerModule');

    expect(mediaPipeModule.isMediaPipePoseLandmarkerAvailable).toBe(true);
    await expect(mediaPipeModule.default.analyzePoseFromImage('file://front.jpg')).resolves.toBe(poseResult);
    await expect(mediaPipeModule.default.analyzeSegmentationFromImage('file://front.jpg')).resolves.toBe(
      segmentationResult,
    );
    expect(nativeModule.analyzePoseFromImage).toHaveBeenCalledWith('file://front.jpg');
    expect(nativeModule.analyzeSegmentationFromImage).toHaveBeenCalledWith('file://front.jpg');
  });
});
