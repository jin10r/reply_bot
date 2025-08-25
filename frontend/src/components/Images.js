import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Images = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API}/images`);
      setImages(response.data);
    } catch (error) {
      console.error("Failed to fetch images:", error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert(`Файл ${file.name} не является изображением`);
        continue;
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Файл ${file.name} слишком большой. Максимальный размер: 5MB`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', ''); // You can add tag input later

      setLoading(true);
      try {
        await axios.post(`${API}/images/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          },
        });
      } catch (error) {
        alert(`Ошибка загрузки ${file.name}: ` + (error.response?.data?.detail || error.message));
      }
    }
    
    setLoading(false);
    setUploadProgress(0);
    await fetchImages();
    
    // Reset file input
    event.target.value = '';
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту картинку?")) return;
    
    try {
      await axios.delete(`${API}/images/${imageId}`);
      await fetchImages();
    } catch (error) {
      alert("Ошибка удаления картинки: " + (error.response?.data?.detail || error.message));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImageUrl = (image) => {
    return `${BACKEND_URL}/uploads/${image.filename}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Управление картинками</h1>
          
          {/* Upload Button */}
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium cursor-pointer">
            📤 Загрузить картинки
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Upload Progress */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Загрузка...</span>
              <span className="text-sm font-medium text-blue-700">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Images Grid */}
        {images.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Нет загруженных картинок
            </h3>
            <p className="text-gray-600">
              Загрузите картинки для использования в автоответах
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Всего картинок: {images.length}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image) => (
                <div key={image.id} className="group relative border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div 
                    className="aspect-square cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={image.original_filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm truncate mb-1">
                      {image.original_filename}
                    </h3>
                    <div className="text-xs text-gray-500">
                      <p>{formatFileSize(image.file_size)}</p>
                      {image.width && image.height && (
                        <p>{image.width} × {image.height}</p>
                      )}
                      <p>{new Date(image.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    
                    {image.tags && image.tags.length > 0 && (
                      <div className="mt-2">
                        {image.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                            {tag}
                          </span>
                        ))}
                        {image.tags.length > 2 && (
                          <span className="text-xs text-gray-500">+{image.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={() => deleteImage(image.id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Image Preview Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold">{selectedImage.original_filename}</h2>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4">
                <img
                  src={getImageUrl(selectedImage)}
                  alt={selectedImage.original_filename}
                  className="max-w-full max-h-96 mx-auto"
                />
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Размер файла:</strong> {formatFileSize(selectedImage.file_size)}
                  </div>
                  <div>
                    <strong>Тип:</strong> {selectedImage.mime_type}
                  </div>
                  {selectedImage.width && selectedImage.height && (
                    <div>
                      <strong>Разрешение:</strong> {selectedImage.width} × {selectedImage.height}
                    </div>
                  )}
                  <div>
                    <strong>Загружено:</strong> {new Date(selectedImage.uploaded_at).toLocaleString()}
                  </div>
                </div>
                
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div className="mt-4">
                    <strong>Теги:</strong>
                    <div className="mt-2">
                      {selectedImage.tags.map((tag, index) => (
                        <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex space-x-3">
                  <a
                    href={getImageUrl(selectedImage)}
                    download={selectedImage.original_filename}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    📥 Скачать
                  </a>
                  <button
                    onClick={() => {
                      deleteImage(selectedImage.id);
                      setSelectedImage(null);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Instructions */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Поддерживаемые форматы:</h3>
          <div className="text-sm text-gray-600">
            <ul className="list-disc list-inside space-y-1">
              <li>JPEG (.jpg, .jpeg) - для фотографий</li>
              <li>PNG (.png) - для картинок с прозрачностью</li>
              <li>GIF (.gif) - для анимированных изображений</li>
              <li>SVG (.svg) - для векторной графики</li>
            </ul>
            <p className="mt-2">
              <strong>Максимальный размер файла:</strong> 5 МБ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Images;