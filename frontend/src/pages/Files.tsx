import React, { useEffect, useState } from "react";
import { FolderOpen, Upload, Download, Trash2, X, FileText } from "lucide-react";
import { apiRequest } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.js";

interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isPublic: boolean;
  downloadUrl: string;
  createdAt: string;
}

export const Files: React.FC = () => {
  const { activeOrg } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isViewer = activeOrg?.role === "viewer";

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<FileRecord[]>("/api/v1/files");
      setFiles(data || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isViewer) return;
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(",")[1];
          await apiRequest("/api/v1/files", {
            method: "POST",
            body: JSON.stringify({
              filename: selectedFile.name,
              mimeType: selectedFile.type || "application/octet-stream",
              contentBase64: base64Content,
              isPublic: false,
            }),
          });
          setShowUpload(false);
          setSelectedFile(null);
          await fetchFiles();
        } catch (err: any) {
          alert("Upload failed: " + err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      alert("Error reading file: " + err.message);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isViewer) return;
    if (!confirm("Delete this file permanently?")) return;
    try {
      await apiRequest(`/api/v1/files/${id}`, { method: "DELETE" });
      await fetchFiles();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <span>Files & Storage</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tenant-isolated storage for assets, invoices, and documents.
          </p>
        </div>

        {!isViewer && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-mono">
          Loading files...
        </div>
      ) : files.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No files uploaded yet</div>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-xs">{f.filename}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {formatSize(f.sizeBytes)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                    {f.mimeType}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={f.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {!isViewer && (
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload Document</span>
              </h3>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select File from Disk
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
