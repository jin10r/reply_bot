import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Upload, 
  Image, 
  FileImage, 
  Trash2, 
  Eye,
  Download,
  Filter,
  Search,
  Grid,
  List,
  Plus,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MediaManager = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    file: null,
    fileType: "image",
    tags: ""
  });

  const fetchMediaFiles = async () => {
    try {
      const response = await axios.get(`${API}/media`);
      setMediaFiles(response.data);
      setFilteredFiles(response.data);
    } catch (error) {
      console.error("Failed to fetch media files:", error);
    }
  };

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  useEffect(() => {
    let filtered = mediaFiles;

    // Filter by type
    if (selectedFileType !== "all") {
      filtered = filtered.filter(file => file.file_type === selectedFileType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(file => 
        file.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredFiles(filtered);
  }, [mediaFiles, selectedFileType, searchQuery]);

  const handleFileUpload = async () => {
    if (!uploadForm.file) {
      alert("Выберите файл для загрузки");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("file_type", uploadForm.fileType);
      formData.append("tags", uploadForm.tags);

      const response = await axios.post(`${API}/media/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        alert("Файл успешно загружен!");
        await fetchMediaFiles();
        resetUploadForm();
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Ошибка загрузки файла: " + (error.response?.data?.detail || error.message));
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      fileType: "image",
      tags: ""
    });
    setUploadProgress(0);
    setShowUploadDialog(false);
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот файл?")) {
      return;
    }

    try {
      await axios.delete(`${API}/media/${fileId}`);
      alert("Файл удален");
      await fetchMediaFiles();
    } catch (error) {
      alert("Ошибка удаления файла: " + (error.response?.data?.detail || error.message));
    }
  };

  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case "image":
        return <Image className="w-5 h-5" />;
      case "sticker":
        return <FileImage className="w-5 h-5" />;
      default:
        return <FileImage className="w-5 h-5" />;
    }
  };

  const getFileTypeColor = (fileType) => {
    switch (fileType) {
      case "image":
        return "bg-blue-500";
      case "sticker":
        return "bg-purple-500";
      case "audio":
        return "bg-green-500";
      case "video":
        return "bg-red-500";
      case "document":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileStats = () => {
    const stats = {
      total: mediaFiles.length,
      images: mediaFiles.filter(f => f.file_type === "image").length,
      stickers: mediaFiles.filter(f => f.file_type === "sticker").length,
      totalSize: mediaFiles.reduce((sum, file) => sum + file.file_size, 0)
    };
    return stats;
  };

  const stats = getFileStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление медиафайлами</h1>
          <p className="text-muted-foreground">
            Загружайте и управляйте изображениями, стикерами и другими медиафайлами
          </p>
        </div>
        
        <Button onClick={() => setShowUploadDialog(true)} size="lg">
          <Upload className="w-4 h-4 mr-2" />
          Загрузить файл
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего файлов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Изображений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.images}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Стикеров</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.stickers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Общий размер</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatFileSize(stats.totalSize)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder="Поиск по названию или тегам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Тип файла" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="image">Изображения</SelectItem>
                  <SelectItem value="sticker">Стикеры</SelectItem>
                  <SelectItem value="audio">Аудио</SelectItem>
                  <SelectItem value="video">Видео</SelectItem>
                  <SelectItem value="document">Документы</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-3 relative overflow-hidden">
                  {file.file_type === "image" ? (
                    <img
                      src={`${BACKEND_URL}/uploads/${file.filename}`}
                      alt={file.original_filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`w-12 h-12 rounded-full ${getFileTypeColor(file.file_type)} flex items-center justify-center text-white`}>
                        {getFileTypeIcon(file.file_type)}
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback for broken images */}
                  <div className="w-full h-full hidden items-center justify-center">
                    <div className={`w-12 h-12 rounded-full ${getFileTypeColor(file.file_type)} flex items-center justify-center text-white`}>
                      {getFileTypeIcon(file.file_type)}
                    </div>
                  </div>

                  {/* Action overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteFile(file.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(file.file_size)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm font-medium truncate" title={file.original_filename}>
                    {file.original_filename}
                  </div>
                  
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {file.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{file.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(file.uploaded_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {file.file_type === "image" ? (
                      <img
                        src={`${BACKEND_URL}/uploads/${file.filename}`}
                        alt={file.original_filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded ${getFileTypeColor(file.file_type)} flex items-center justify-center text-white`}>
                        {getFileTypeIcon(file.file_type)}
                      </div>
                    )}
                    
                    {/* Fallback */}
                    <div className="w-8 h-8 rounded bg-gray-400 hidden items-center justify-center text-white">
                      {getFileTypeIcon(file.file_type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.original_filename}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{file.file_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </span>
                      {file.width && file.height && (
                        <span className="text-xs text-muted-foreground">
                          {file.width}×{file.height}
                        </span>
                      )}
                    </div>
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.uploaded_at).toLocaleDateString("ru-RU")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewFile(file)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteFile(file.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">
              {mediaFiles.length === 0 ? "Нет загруженных файлов" : "Файлы не найдены"}
            </CardTitle>
            <CardDescription className="mb-4">
              {mediaFiles.length === 0 
                ? "Загрузите первый медиафайл для использования в правилах"
                : "Попробуйте изменить фильтры поиска"
              }
            </CardDescription>
            {mediaFiles.length === 0 && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Загрузить файл
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={resetUploadForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузить медиафайл</DialogTitle>
            <DialogDescription>
              Выберите файл и настройте параметры загрузки
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-input">Файл</Label>
              <Input
                id="file-input"
                type="file"
                accept="image/*,.webp"
                onChange={(e) => setUploadForm({
                  ...uploadForm,
                  file: e.target.files[0]
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-type">Тип файла</Label>
              <Select 
                value={uploadForm.fileType} 
                onValueChange={(value) => setUploadForm({...uploadForm, fileType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Изображение</SelectItem>
                  <SelectItem value="sticker">Стикер</SelectItem>
                  <SelectItem value="audio">Аудио</SelectItem>
                  <SelectItem value="video">Видео</SelectItem>
                  <SelectItem value="document">Документ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input
                id="tags"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                placeholder="мем, реакция, приветствие"
              />
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Загружается...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{width: `${uploadProgress}%`}}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadForm}>
              Отмена
            </Button>
            <Button onClick={handleFileUpload} disabled={!uploadForm.file || uploadProgress > 0}>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{previewFile?.original_filename}</DialogTitle>
            <DialogDescription>
              Информация о файле
            </DialogDescription>
          </DialogHeader>

          {previewFile && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                {previewFile.file_type === "image" ? (
                  <img
                    src={`${BACKEND_URL}/uploads/${previewFile.filename}`}
                    alt={previewFile.original_filename}
                    className="max-w-full max-h-80 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-full ${getFileTypeColor(previewFile.file_type)} flex items-center justify-center text-white`}>
                      {getFileTypeIcon(previewFile.file_type)}
                    </div>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Тип:</span> {previewFile.file_type}
                </div>
                <div>
                  <span className="font-medium">Размер:</span> {formatFileSize(previewFile.file_size)}
                </div>
                {previewFile.width && previewFile.height && (
                  <>
                    <div>
                      <span className="font-medium">Ширина:</span> {previewFile.width}px
                    </div>
                    <div>
                      <span className="font-medium">Высота:</span> {previewFile.height}px
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium">Загружен:</span> {new Date(previewFile.uploaded_at).toLocaleString("ru-RU")}
                </div>
                <div>
                  <span className="font-medium">Использован:</span> {previewFile.usage_count} раз
                </div>
              </div>

              {/* Tags */}
              {previewFile.tags && previewFile.tags.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Теги:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewFile.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* File ID for copying */}
              <div className="space-y-2">
                <Label>File ID (для использования в правилах):</Label>
                <Input
                  value={previewFile.id}
                  readOnly
                  onClick={(e) => e.target.select()}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Закрыть
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                deleteFile(previewFile.id);
                setPreviewFile(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaManager;