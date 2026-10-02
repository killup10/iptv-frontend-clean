package play.teamg.store;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

@CapacitorPlugin(name = "VodDownload")
public class VodDownloadPlugin extends Plugin {
    private final ExecutorService workers = Executors.newFixedThreadPool(2);
    @PluginMethod
    public void download(PluginCall call) {
        String id=call.getString("id", ""), source=call.getString("url", ""), path=call.getString("path", "");
        workers.execute(() -> {
            File partial=null;
            try {
                URL url=new URL(source);
                if (!(url.getProtocol().equals("https") || url.getProtocol().equals("http")) ||
                    url.getHost().equals("localhost") || url.getHost().equals("127.0.0.1"))
                    throw new IOException("El enlace de descarga no apunta al servidor de contenido.");
                File root=getContext().getFilesDir().getCanonicalFile();
                File output=new File(root,path).getCanonicalFile();
                if (!output.getPath().startsWith(root.getPath()+File.separator)) throw new IOException("Ruta de descarga inválida.");
                File folder=output.getParentFile();if (!folder.exists() && !folder.mkdirs() && !folder.isDirectory())throw new IOException("No se pudo crear la carpeta de descargas.");
                partial=new File(output.getPath()+".part");
                IOException last=null;
                for (int attempt=0;attempt<3;attempt++) {
                    HttpURLConnection connection=null;
                    try {
                        long offset=partial.exists()?partial.length():0;
                        connection=(HttpURLConnection)url.openConnection();
                        connection.setConnectTimeout(20000);connection.setReadTimeout(45000);
                        connection.setInstanceFollowRedirects(true);
                        connection.setRequestProperty("Accept-Encoding","identity");
                        if(offset>0)connection.setRequestProperty("Range","bytes="+offset+"-");
                        int code=connection.getResponseCode();
                        if(code==416){
                            String range=connection.getHeaderField("Content-Range");
                            if(range!=null && range.endsWith("/"+offset) && offset>=102400) {last=null;break;}
                        }
                        if(code!=200 && code!=206)throw new IOException("HTTP "+code+": no se pudo descargar el contenido.");
                        String type=connection.getContentType();
                        if(type!=null && (type.contains("text/html") || type.contains("application/json")))
                            throw new IOException("El enlace devolvió una página de error en lugar del video.");
                        boolean append=code==206 && offset>0;
                        if(code==206){
                            String range=connection.getHeaderField("Content-Range");
                            if(range==null || !range.startsWith("bytes "+offset+"-"))throw new IOException("Respuesta parcial inválida.");
                        }
                        if(!append)offset=0;
                        String lengthHeader=connection.getHeaderField("Content-Length");
                        long length=lengthHeader==null?-1:Long.parseLong(lengthHeader);
                        long total=length>0?offset+length:0;
                        String rangeTotal=connection.getHeaderField("Content-Range");
                        if(code==206 && rangeTotal!=null){String value=rangeTotal.substring(rangeTotal.lastIndexOf('/')+1);if(!value.equals("*"))total=Long.parseLong(value);}
                        if(total>0 && folder.getUsableSpace()<total-offset+10485760)throw new IOException("No hay suficiente espacio libre para guardar el video.");
                        long bytes=offset,lastEmit=0;
                        emit(id,bytes,total);
                        try (InputStream input=new BufferedInputStream(connection.getInputStream(),262144);
                             OutputStream out=new BufferedOutputStream(new FileOutputStream(partial,append),262144)) {
                            byte[] buffer=new byte[262144];int count;
                            while((count=input.read(buffer))!=-1){
                                out.write(buffer,0,count);bytes+=count;
                                long now=System.currentTimeMillis();if(now-lastEmit>=500){emit(id,bytes,total);lastEmit=now;}
                            }
                        }
                        if(bytes<102400 || (total>0 && bytes!=total))throw new IOException("La conexión se interrumpió antes de completar el video.");
                        emit(id,bytes,total);last=null;break;
                    } catch(IOException error){last=error;if(attempt==2)throw error;}
                    finally {if(connection!=null)connection.disconnect();}
                }
                if(last!=null)throw last;
                if(!partial.renameTo(output))throw new IOException("No se pudo finalizar el archivo descargado.");
                JSObject result=new JSObject();result.put("path",output.getAbsolutePath());result.put("size",output.length());call.resolve(result);
            } catch(Exception error){if(partial!=null && partial.exists())partial.delete();call.reject(error.getMessage(),error);}
        });
    }
    private void emit(String id,long bytes,long total){
        JSObject event=new JSObject();event.put("id",id);event.put("bytes",bytes);event.put("total",total);notifyListeners("progress",event);
    }
    @Override protected void handleOnDestroy(){workers.shutdown();super.handleOnDestroy();}
}
