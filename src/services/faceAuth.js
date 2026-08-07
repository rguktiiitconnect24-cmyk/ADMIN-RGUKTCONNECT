import * as faceapi from 'face-api.js';

// Configuration
const MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

/**
 * Loads the necessary face-api.js models.
 */
export const loadModels = async () => {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL) // High accuracy detector
        ]);
        console.log("Face API models loaded");
        return true;
    } catch (error) {
        console.error("Error loading Face API models:", error);
        return false;
    }
};

/**
 * Detects a face in the video/image element and returns the descriptor.
 * @param {HTMLVideoElement | HTMLImageElement} input
 * @returns {Promise<Float32Array | null>} Face descriptor or null
 */
export const getFaceDescriptor = async (input) => {
    // Use TinyFaceDetector for speed, or SsdMobilenetv1 for accuracy
    // let's try SSD for better enrollment/login accuracy even if slightly slower
    const detections = await faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detections) {
        return null;
    }

    return detections.descriptor;
};

/**
 * Compares two face descriptors.
 * @param {Float32Array} descriptor1 
 * @param {Float32Array} descriptor2 
 * @returns {number} Euclidean distance (lower is better, < 0.6 is usually a match)
 */
export const compareFaces = (descriptor1, descriptor2) => {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
};

/**
 * Creates a labeled face descriptor for saving.
 * @param {string} label User ID or Name
 * @param {Float32Array} descriptor 
 */
export const createLabeledDescriptor = (label, descriptor) => {
    return new faceapi.LabeledFaceDescriptors(label, [descriptor]);
};

/**
 * Checks if a face match is found.
 * @param {Float32Array} inputDescriptor 
 * @param {Array<number>} savedDescriptorArray - The array from Firestore
 * @returns {boolean}
 */
export const isFaceMatch = (inputDescriptor, savedDescriptorArray) => {
    if (!inputDescriptor || !savedDescriptorArray) return false;

    // Convert array back to Float32Array if needed
    const savedDescriptor = new Float32Array(savedDescriptorArray);
    const distance = faceapi.euclideanDistance(inputDescriptor, savedDescriptor);

    // Threshold usually 0.6, strict 0.5
    return distance < 0.5;
};

/**
 * Calculates the Eye Aspect Ratio (EAR) to detect blinking.
 * @param {faceapi.FaceLandmarks68} landmarks 
 * @returns {number} EAR value (lower means closed eyes)
 */
export const getEyeAspectRatio = (landmarks) => {
    const getEAR = (eye) => {
        const A = faceapi.euclideanDistance(eye[1], eye[5]);
        const B = faceapi.euclideanDistance(eye[2], eye[4]);
        const C = faceapi.euclideanDistance(eye[0], eye[3]);
        return (A + B) / (2.0 * C);
    };

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const leftEAR = getEAR(leftEye);
    const rightEAR = getEAR(rightEye);

    return (leftEAR + rightEAR) / 2.0;
};

/**
 * Checks if the user is likely blinking based on EAR threshold.
 * @param {number} ear 
 * @returns {boolean}
 */
export const isBlinking = (ear) => {
    // EAR threshold for blink is typically around 0.2 - 0.3
    // Relaxed to 0.3 to make it easier to trigger
    // console.log("Current EAR:", ear); 
    return ear < 0.3;
};

/**
 * Computes the mean descriptor from multiple samples.
 * @param {Array<Float32Array>} descriptors 
 * @returns {Float32Array} Mean descriptor
 */
export const computeMeanDescriptor = (descriptors) => {
    if (!descriptors || descriptors.length === 0) return null;

    const numDescriptors = descriptors.length;
    const descriptorLength = descriptors[0].length;
    const meanDescriptor = new Float32Array(descriptorLength);

    for (let i = 0; i < numDescriptors; i++) {
        for (let j = 0; j < descriptorLength; j++) {
            meanDescriptor[j] += descriptors[i][j];
        }
    }

    for (let j = 0; j < descriptorLength; j++) {
        meanDescriptor[j] /= numDescriptors;
    }

    return meanDescriptor;
};

/**
 * Strict verification with a specific threshold.
 * @param {Float32Array} inputDescriptor 
 * @param {Array<number>} savedDescriptorArray 
 * @param {number} threshold 
 * @returns {boolean}
 */
export const verifyIdentityStrict = (inputDescriptor, savedDescriptorArray, threshold = 0.55) => {
    if (!inputDescriptor || !savedDescriptorArray) return false;
    const savedDescriptor = new Float32Array(savedDescriptorArray);
    const distance = faceapi.euclideanDistance(inputDescriptor, savedDescriptor);
    console.log("Face Match Distance:", distance, "Threshold:", threshold); // Debugging
    return distance < threshold;
};
