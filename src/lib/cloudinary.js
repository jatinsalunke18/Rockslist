
/**
 * Uploads an image to Cloudinary
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The URL of the uploaded image
 */
/**
 * Internal helper to compress and resize images before upload
 */
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('Canvas to Blob failed'));
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

/**
 * Uploads an image to Cloudinary (with auto-compression)
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The URL of the uploaded image
 */
export const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset || cloudName.includes('your_cloud_name')) {
        throw new Error('Cloudinary not configured. Please check .env file.');
    }

    try {
        // Step 1: Compress image client-side to speed up upload
        const compressedFile = await compressImage(file).catch(err => {
            console.warn('Compression failed, uploading original:', err);
            return file;
        });

        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw error;
    }
};
