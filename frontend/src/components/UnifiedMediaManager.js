import React, { useState, useEffect, useRef } from "react";
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
  X,
  File,
  Tag,
  Calendar,
  CheckCircle,
  AlertCircle,
  Music,
  Video,
  FileText
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

const UnifiedMediaManager = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);
  const [apiEndpoint, setApiEndpoint] = useState("media"); // "media" or "images"
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    file: null,
    fileType: "image",
    tags: "",
    preview: null
  });

  const fetchMediaFiles = async () => {
    try {
      // Try new media API first, fallback to old images API
      let response;
      try {
        response = await axios.get(`${API}/media`);
        setApiEndpoint("media");
      } catch (error) {
        console.log("New media API not available, trying images API...");
        response = await axios.get(`${API}/images`);
        setApiEndpoint("images");
        
        // Transform old images format to new media format
        response.data = response.data.map(img => ({
          ...img,
          file_type: "image",
          original_filename: img.original_filename,
          file_size: img.file_size,
          uploaded_at: img.uploaded_at,
          usage_count: img.usage_count || 0,
          tags: img.tags || []
        }));
      }
      
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
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }

    setFilteredFiles(filtered);
  }, [mediaFiles, selectedFileType, searchQuery]);

  const handleFileUpload = async () => {
    if (!uploadForm.file) {
      setUploadError("Выберите файл для загрузки");
      return;
    }

    // Проверяем размер файла (максимум 10MB)
    if (uploadForm.file.size > 10 * 1024 * 1024) {
      setUploadError("Размер файла не должен превышать 10MB");
      return;
    }

    try {
      setUploadStatus(null);
      setUploadError("");
      
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      
      if (apiEndpoint === "media") {
        formData.append("file_type", uploadForm.fileType);
        formData.append("tags", uploadForm.tags);
      } else {
        formData.append("tags", uploadForm.tags);
      }

      const uploadUrl = apiEndpoint === "media" ? `${API}/media/upload` : `${API}/images/upload`;
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success !== false) {
        setUploadStatus("success");
        setTimeout(async () => {
          await fetchMediaFiles();
          resetUploadForm();
        }, 1500);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setUploadError(error.response?.data?.detail || error.message || "Ошибка загрузки файла");
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      fileType: "image",
      tags: "",
      preview: null
    });
    setUploadProgress(0);
    setUploadStatus(null);
    setUploadError("");
    setShowUploadDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Автоопределение типа файла
    let detectedType = "document";
    if (file.type.startsWith("image/")) {
      detectedType = "image";
    } else if (file.type.startsWith("audio/")) {
      detectedType = "audio";
    } else if (file.type.startsWith("video/")) {
      detectedType = "video";
    }

    // Создаем превью для изображений
    let preview = null;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }

    setUploadForm({
      ...uploadForm,
      file,
      fileType: detectedType,
      preview
    });
    setUploadError("");
  };

  // Drag & Drop функции
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
      if (!showUploadDialog) {
        setShowUploadDialog(true);
      }
    }
  };

  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case "image":
        return <Image className="w-5 h-5" />;
      case "sticker":
        return <FileImage className="w-5 h-5" />;
      case "audio":
        return <Music className="w-5 h-5" />;
      case "video":
        return <Video className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
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

  const getSupportedFormats = (fileType) => {
    const formats = {
      image: "JPG, PNG, GIF, WebP, SVG",
      sticker: "WebP, TGS",
      audio: "MP3, OGG, WAV, M4A",
      video: "MP4, WebM, MOV, AVI",
      document: "PDF, TXT, DOC, DOCX"
    };
    return formats[fileType] || "Различные форматы";
  };

  const deleteFile = async (fileId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот файл?")) {
      return;
    }

    try {
      const deleteUrl = apiEndpoint === "media" ? `${API}/media/${fileId}` : `${API}/images/${fileId}`;
      await axios.delete(deleteUrl);
      alert("Файл удален");
      await fetchMediaFiles();
    } catch (error) {
      alert("Ошибка удаления файла: " + (error.response?.data?.detail || error.message));
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
      images: mediaFiles.filter(f => f.file_type === "image" || !f.file_type).length,
      stickers: mediaFiles.filter(f => f.file_type === "sticker").length,
      totalSize: mediaFiles.reduce((sum, file) => sum + file.file_size, 0),
      active: mediaFiles.filter(f => f.is_active !== false).length
    };
    return stats;
  };

  const stats = getFileStats();

  const getImageUrl = (file) => {
    if (apiEndpoint === "media") {
      return `${BACKEND_URL}/uploads/${file.filename}`;
    } else {
      return `${BACKEND_URL}/uploads/${file.filename}`;
    }
  };

  return (
    <div 
      className={`space-y-6 ${isDragging ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-600/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-xl border-2 border-dashed border-blue-500">
            <div className="text-center">
              <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-blue-600">
                Отпустите для загрузки файла
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Медиафайлы</h1>
          <p className="text-muted-foreground">
            Управление изображениями, стикерами и другими медиафайлами для автоответов
          </p>
          {apiEndpoint === "images" && (
            <Badge variant="outline" className="mt-2">
              Использует старый API изображений
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Быстрая загрузка
          </Button>
          <Button onClick={() => setShowUploadDialog(true)} size="lg">
            <Upload className="w-4 h-4 mr-2" />
            Загрузить файл
          </Button>
        </div>
      </div>

      {/* Hidden file input for quick upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,audio/*,video/*,.pdf,.txt,.doc,.docx"
        onChange={(e) => {
          handleFileSelect(e.target.files[0]);
          setShowUploadDialog(true);
        }}
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
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
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию или тегам..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <Select value={selectedFileType} onValueChange={setSelectedFileType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Тип файла" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="image">Изображения</SelectItem>
                  <SelectItem value="sticker">Стикеры</SelectItem>
                  {apiEndpoint === "media" && (
                    <>
                      <SelectItem value="audio">Аудио</SelectItem>
                      <SelectItem value="video">Видео</SelectItem>
                      <SelectItem value="document">Документы</SelectItem>
                    </>
                  )}
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
            <Card key={file.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {(file.file_type === "image" || !file.file_type) ? (
                  <img
                    src={getImageUrl(file)}
                    alt={file.original_filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : file.mime_type?.includes("svg") ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <File className="w-16 h-16 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-full ${getFileTypeColor(file.file_type)} flex items-center justify-center text-white`}>
                      {getFileTypeIcon(file.file_type)}
                    </div>
                  </div>
                )}
                
                {/* Fallback for broken images */}
                <div className="w-full h-full hidden items-center justify-center">
                  <div className={`w-12 h-12 rounded-full ${getFileTypeColor(file.file_type || "image")} flex items-center justify-center text-white`}>
                    {getFileTypeIcon(file.file_type || "image")}
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

                {/* Status indicator */}
                {file.is_active !== undefined && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-3 h-3 rounded-full ${file.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
                  </div>
                )}
              </div>
              
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type || "image"}
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
                          <Tag className="w-2 h-2 mr-1" />
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
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
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
                    {(file.file_type === "image" || !file.file_type) ? (
                      <img
                        src={getImageUrl(file)}
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
                      {getFileTypeIcon(file.file_type || "image")}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.original_filename}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{file.file_type || "image"}</Badge>
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
                            <Tag className="w-2 h-2 mr-1" />
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Загрузить медиафайл</DialogTitle>
            <DialogDescription>
              Перетащите файл или выберите с компьютера
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Drag & Drop Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : uploadForm.file 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadForm.file ? (
                <div className="space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center justify-center">
                    {uploadForm.preview ? (
                      <img 
                        src={uploadForm.preview} 
                        alt="Preview" 
                        className="max-w-32 max-h-32 object-contain rounded-lg"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-full ${getFileTypeColor(uploadForm.fileType)} flex items-center justify-center text-white`}>
                        {getFileTypeIcon(uploadForm.fileType)}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm font-medium text-green-600">
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    {uploadForm.file.name}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {formatFileSize(uploadForm.file.size)} • {uploadForm.file.type}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Выбрать другой файл
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Перетащите файл сюда
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      или
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Выберите файл
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    Максимальный размер: 10MB
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,audio/*,video/*,.pdf,.txt,.doc,.docx"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
            </div>

            {/* File Type Selector */}
            {apiEndpoint === "media" && uploadForm.file && (
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
                    <SelectItem value="image">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Изображение
                      </div>
                    </SelectItem>
                    <SelectItem value="sticker">
                      <div className="flex items-center gap-2">
                        <FileImage className="w-4 h-4" />
                        Стикер
                      </div>
                    </SelectItem>
                    <SelectItem value="audio">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        Аудио
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        Видео
                      </div>
                    </SelectItem>
                    <SelectItem value="document">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Документ
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  Поддерживаемые форматы: {getSupportedFormats(uploadForm.fileType)}
                </div>
              </div>
            )}

            {/* Tags Input */}
            <div className="space-y-2">
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input
                id="tags"
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                placeholder="мем, реакция, приветствие, автоответ"
              />
              <div className="text-xs text-muted-foreground">
                Теги помогут найти файл в будущем
              </div>
            </div>

            {/* Upload Progress */}
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

            {/* Status Messages */}
            {uploadStatus === "success" && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                Файл успешно загружен!
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {uploadError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadForm}>
              Отмена
            </Button>
            <Button 
              onClick={handleFileUpload} 
              disabled={!uploadForm.file || uploadProgress > 0}
            >
              {uploadProgress > 0 ? (
                <>Загружается... {uploadProgress}%</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить
                </>
              )}
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
                {(previewFile.file_type === "image" || !previewFile.file_type) ? (
                  <img
                    src={getImageUrl(previewFile)}
                    alt={previewFile.original_filename}
                    className="max-w-full max-h-80 object-contain rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-full ${getFileTypeColor(previewFile.file_type)} flex items-center justify-center text-white`}>
                      {getFileTypeIcon(previewFile.file_type)}
                    </div>
                  </div>
                )}
                
                {/* Fallback for broken images */}
                <div className="w-32 h-32 bg-muted rounded-lg hidden items-center justify-center">
                  <div className={`w-16 h-16 rounded-full ${getFileTypeColor(previewFile.file_type || "image")} flex items-center justify-center text-white`}>
                    {getFileTypeIcon(previewFile.file_type || "image")}
                  </div>
                </div>
              </div>

              {/* File Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Тип:</span> {previewFile.file_type || "image"}
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
                  <span className="font-medium">Использован:</span> {previewFile.usage_count || 0} раз
                </div>
              </div>

              {/* Tags */}
              {previewFile.tags && previewFile.tags.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Теги:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewFile.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        <Tag className="w-3 h-3 mr-1" />
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
                <div className="text-xs text-muted-foreground">
                  Кликните для выделения ID, который можно использовать в правилах автоответов
                </div>
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

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Поддерживаемые форматы и возможности</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Image className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">Изображения</div>
                <div className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <FileImage className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">Стикеры</div>
                <div className="text-xs text-muted-foreground">Анимированные и статичные</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <File className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">SVG</div>
                <div className="text-xs text-muted-foreground">Векторная графика</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium">Теги</div>
                <div className="text-xs text-muted-foreground">Организация и поиск</div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <h4 className="font-medium">Возможности:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Загрузка файлов до 5MB</li>
              <li>• Автоматическое определение размеров изображений</li>
              <li>• Система тегов для организации файлов</li>
              <li>• Предварительный просмотр файлов</li>
              <li>• Поиск по названию и тегам</li>
              <li>• Использование в правилах автоответов</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedMediaManager;