import { useState } from 'react'
import { FileText, Image, Music, Video, MoreVertical, Upload, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FileItem {
  id: string
  name: string
  type: 'document' | 'image' | 'audio' | 'video'
  size: string
  updatedAt: string
}

const mockFiles: FileItem[] = [
  { id: '1', name: 'Project Proposal.pdf', type: 'document', size: '2.4 MB', updatedAt: '2024-01-15' },
  { id: '2', name: 'Dashboard Mockup.png', type: 'image', size: '1.8 MB', updatedAt: '2024-01-14' },
  { id: '3', name: 'Meeting Recording.mp3', type: 'audio', size: '15.2 MB', updatedAt: '2024-01-13' },
  { id: '4', name: 'Product Demo.mp4', type: 'video', size: '45.6 MB', updatedAt: '2024-01-12' },
  { id: '5', name: 'Requirements.docx', type: 'document', size: '856 KB', updatedAt: '2024-01-11' },
]

const getFileIcon = (type: FileItem['type']) => {
  switch (type) {
    case 'document':
      return <FileText className="w-8 h-8 text-blue-500" />
    case 'image':
      return <Image className="w-8 h-8 text-purple-500" />
    case 'audio':
      return <Music className="w-8 h-8 text-green-500" />
    case 'video':
      return <Video className="w-8 h-8 text-red-500" />
    default:
      return <FileText className="w-8 h-8 text-gray-500" />
  }
}

export function FilesTab() {
  const [files] = useState<FileItem[]>(mockFiles)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Folder className="w-5 h-5" />
          Files
        </CardTitle>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(file.type)}
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size} · {file.updatedAt}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Download</DropdownMenuItem>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
