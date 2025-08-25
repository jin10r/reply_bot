import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  File,
  Download,
  Tag,
  Calendar,
  FileImage
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Images = () => {
  const [images, setImages] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tags, setTags] = useState("");

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

  const uploadImage = async () => {
    if (!selectedFile) {
      alert("Выберите файл для загрузки");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("tags", tags);

      await axios.post(`${API}/images/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setShowUploadForm(false);
      setSelectedFile(null);
      setTags("");
      await fetchImages();
      alert("Изображение загружено успешно!");
    } catch (error) {
      alert("Ошибка загрузки: " + error.response?.data?.detail || error.message);
    }
    setUploading(false);
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm("Вы уверены, что хотите удалить это изображение?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/images/${imageId}`);
      await fetchImages();
      alert("Изображение удалено");
    } catch (error) {
      alert("Ошибка удаления: " + error.response?.data?.detail || error.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileTypeIcon = (mimeType) => {
    if (mimeType.includes("svg")) return File;
    return ImageIcon;
  };

  const totalSize = images.reduce((sum, img) => sum + img.file_size, 0);
  const activeImages = images.filter(img => img.is_active).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Изображения</h1>
          <p className="text-muted-foreground">
            Управление медиафайлами для автоответов
          </p>
        </div>
        
        <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Upload className="w-4 h-4 mr-2" />
              Загрузить
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Загрузить изображение</DialogTitle>
              <DialogDescription>
                Выберите файл изображения для использования в автоответах
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="file">Файл изображения</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
                <div className="text-xs text-muted-foreground">
                  Поддерживаемые форматы: JPG, PNG, GIF, SVG. Макс. размер: 5MB
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Теги (через запятую)</Label>
                <Input
                  id="tags"
                  placeholder="мемы, реакции, стикеры"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={uploadImage} disabled={uploading || !selectedFile}>
                {uploading ? "Загрузка..." : "Загрузить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего файлов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeImages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общий размер</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatFileSize(totalSize)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Лимит</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">5MB</div>
          </CardContent>
        </Card>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image) => {
          const FileTypeIcon = getFileTypeIcon(image.mime_type);
          
          return (
            <Card key={image.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <div className="aspect-square bg-muted relative group">
                {image.mime_type.includes("svg") ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileTypeIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={`${BACKEND_URL}/uploads/${image.filename}`}
                    alt={image.original_filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                )}
                <div className="w-full h-full hidden items-center justify-center">
                  <FileImage className="w-16 h-16 text-muted-foreground" />
                </div>
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                  <Button size="icon" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="destructive"
                    className="bg-destructive/80 hover:bg-destructive text-destructive-foreground"
                    onClick={() => deleteImage(image.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Status indicator */}
                <div className="absolute top-2 right-2">
                  <div className={`w-3 h-3 rounded-full ${image.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-sm truncate" title={image.original_filename}>
                  {image.original_filename}
                </CardTitle>
                <CardDescription className="text-xs">
                  {formatFileSize(image.file_size)}
                  {image.width && image.height && ` • ${image.width}×${image.height}`}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Tags */}
                {image.tags && image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {image.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Tag className="w-2 h-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {image.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{image.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Upload date */}
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(image.uploaded_at).toLocaleDateString("ru-RU")}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Нет загруженных изображений</CardTitle>
            <CardDescription className="mb-4">
              Загрузите первое изображение для использования в автоответах
            </CardDescription>
            <Button onClick={() => setShowUploadForm(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить изображение
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Поддерживаемые форматы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">JPEG</div>
                <div className="text-xs text-muted-foreground">Фотографии</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">PNG</div>
                <div className="text-xs text-muted-foreground">С прозрачностью</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">GIF</div>
                <div className="text-xs text-muted-foreground">Анимация</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <File className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">SVG</div>
                <div className="text-xs text-muted-foreground">Векторная</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Images;