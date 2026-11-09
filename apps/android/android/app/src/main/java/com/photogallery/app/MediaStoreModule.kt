package com.photogallery.app

import android.content.ContentUris
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

class MediaStoreModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MediaStoreScanner"

    @ReactMethod
    fun scanMedia(options: ReadableMap?, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val includeVideos = if (options?.hasKey("includeVideos") == true) options.getBoolean("includeVideos") else true
                val limit = if (options?.hasKey("limit") == true) options.getInt("limit") else 500
                val mediaList = Arguments.createArray()

                val isoFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }

                // Temporary list to sort photos and videos together chronologically
                data class MediaRecord(
                    val id: String,
                    val contentHash: String,
                    val fileUri: String,
                    val filePath: String,
                    val fileName: String,
                    val fileSize: Long,
                    val mimeType: String,
                    val width: Int,
                    val height: Int,
                    val captureDate: String,
                    val modifiedDate: String,
                    val bucketName: String,
                    val isVideo: Boolean,
                    val duration: Long,
                    val timestamp: Long
                )

                val records = mutableListOf<MediaRecord>()

                // 1. Query Real Images
                val imageProjection = arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DATA,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.SIZE,
                    MediaStore.Images.Media.DATE_MODIFIED,
                    MediaStore.Images.Media.DATE_TAKEN,
                    MediaStore.Images.Media.MIME_TYPE,
                    MediaStore.Images.Media.WIDTH,
                    MediaStore.Images.Media.HEIGHT,
                    MediaStore.Images.Media.BUCKET_DISPLAY_NAME
                )

                reactContext.contentResolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    imageProjection,
                    null,
                    null,
                    "${MediaStore.Images.Media.DATE_MODIFIED} DESC"
                )?.use { cursor ->
                    val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                    val dataCol = cursor.getColumnIndex(MediaStore.Images.Media.DATA)
                    val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                    val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                    val modCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)
                    val takenCol = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
                    val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.MIME_TYPE)
                    val widthCol = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH)
                    val heightCol = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT)
                    val bucketCol = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)

                    var count = 0
                    while (cursor.moveToNext() && count < limit) {
                        val id = cursor.getLong(idCol)
                        val data = if (dataCol != -1) cursor.getString(dataCol) ?: "" else ""
                        val name = cursor.getString(nameCol) ?: "photo_$id.jpg"
                        val size = cursor.getLong(sizeCol)
                        val dateModified = cursor.getLong(modCol) * 1000L
                        val dateTaken = if (takenCol != -1 && !cursor.isNull(takenCol)) cursor.getLong(takenCol) else dateModified
                        val mime = cursor.getString(mimeCol) ?: "image/jpeg"
                        val width = if (widthCol != -1) cursor.getInt(widthCol) else 0
                        val height = if (heightCol != -1) cursor.getInt(heightCol) else 0
                        val bucket = if (bucketCol != -1) cursor.getString(bucketCol) ?: "Camera" else "Camera"

                        val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id).toString()
                        val timestamp = if (dateTaken > 0) dateTaken else dateModified

                        records.add(
                            MediaRecord(
                                id = "img_$id",
                                contentHash = "sha_$id",
                                fileUri = contentUri,
                                filePath = data,
                                fileName = name,
                                fileSize = size,
                                mimeType = mime,
                                width = width,
                                height = height,
                                captureDate = isoFormatter.format(Date(timestamp)),
                                modifiedDate = isoFormatter.format(Date(dateModified)),
                                bucketName = bucket,
                                isVideo = false,
                                duration = 0,
                                timestamp = timestamp
                            )
                        )
                        count++
                    }
                }

                // 2. Query Real Videos if requested
                if (includeVideos) {
                    val videoProjection = arrayOf(
                        MediaStore.Video.Media._ID,
                        MediaStore.Video.Media.DATA,
                        MediaStore.Video.Media.DISPLAY_NAME,
                        MediaStore.Video.Media.SIZE,
                        MediaStore.Video.Media.DATE_MODIFIED,
                        MediaStore.Video.Media.DATE_TAKEN,
                        MediaStore.Video.Media.MIME_TYPE,
                        MediaStore.Video.Media.WIDTH,
                        MediaStore.Video.Media.HEIGHT,
                        MediaStore.Video.Media.DURATION,
                        MediaStore.Video.Media.BUCKET_DISPLAY_NAME
                    )

                    reactContext.contentResolver.query(
                        MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                        videoProjection,
                        null,
                        null,
                        "${MediaStore.Video.Media.DATE_MODIFIED} DESC"
                    )?.use { cursor ->
                        val idCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                        val dataCol = cursor.getColumnIndex(MediaStore.Video.Media.DATA)
                        val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)
                        val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                        val modCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATE_MODIFIED)
                        val takenCol = cursor.getColumnIndex(MediaStore.Video.Media.DATE_TAKEN)
                        val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Video.Media.MIME_TYPE)
                        val widthCol = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH)
                        val heightCol = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT)
                        val durCol = cursor.getColumnIndex(MediaStore.Video.Media.DURATION)
                        val bucketCol = cursor.getColumnIndex(MediaStore.Video.Media.BUCKET_DISPLAY_NAME)

                        var count = 0
                        while (cursor.moveToNext() && count < limit) {
                            val id = cursor.getLong(idCol)
                            val data = if (dataCol != -1) cursor.getString(dataCol) ?: "" else ""
                            val name = cursor.getString(nameCol) ?: "video_$id.mp4"
                            val size = cursor.getLong(sizeCol)
                            val dateModified = cursor.getLong(modCol) * 1000L
                            val dateTaken = if (takenCol != -1 && !cursor.isNull(takenCol)) cursor.getLong(takenCol) else dateModified
                            val mime = cursor.getString(mimeCol) ?: "video/mp4"
                            val width = if (widthCol != -1) cursor.getInt(widthCol) else 0
                            val height = if (heightCol != -1) cursor.getInt(heightCol) else 0
                            val duration = if (durCol != -1) cursor.getLong(durCol) else 0L
                            val bucket = if (bucketCol != -1) cursor.getString(bucketCol) ?: "Videos" else "Videos"

                            val contentUri = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, id).toString()
                            val timestamp = if (dateTaken > 0) dateTaken else dateModified

                            records.add(
                                MediaRecord(
                                    id = "vid_$id",
                                    contentHash = "sha_vid_$id",
                                    fileUri = contentUri,
                                    filePath = data,
                                    fileName = name,
                                    fileSize = size,
                                    mimeType = mime,
                                    width = width,
                                    height = height,
                                    captureDate = isoFormatter.format(Date(timestamp)),
                                    modifiedDate = isoFormatter.format(Date(dateModified)),
                                    bucketName = bucket,
                                    isVideo = true,
                                    duration = duration,
                                    timestamp = timestamp
                                )
                            )
                            count++
                        }
                    }
                }

                // Sort newest first
                records.sortByDescending { it.timestamp }

                // Convert to React Native WritableArray
                for (rec in records) {
                    val map = Arguments.createMap().apply {
                        putString("id", rec.id)
                        putString("contentHash", rec.contentHash)
                        putString("fileUri", rec.fileUri)
                        putString("filePath", rec.filePath)
                        putString("fileName", rec.fileName)
                        putDouble("fileSize", rec.fileSize.toDouble())
                        putString("mimeType", rec.mimeType)
                        putInt("width", rec.width)
                        putInt("height", rec.height)
                        putString("captureDate", rec.captureDate)
                        putString("modifiedDate", rec.modifiedDate)
                        putString("importedDate", rec.modifiedDate)
                        putBoolean("isFavorite", false)
                        putBoolean("isDeleted", false)
                        putString("bucketName", rec.bucketName)
                        putBoolean("isVideo", rec.isVideo)
                        putDouble("duration", rec.duration.toDouble())
                        putString("syncState", "local")
                    }
                    mediaList.pushMap(map)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(mediaList)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("MEDIA_SCAN_ERROR", e.message, e)
                }
            }
        }
    }

    @ReactMethod
    fun getAlbums(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val albumMap = mutableMapOf<String, Triple<Int, String, Long>>()

                val projection = arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
                    MediaStore.Images.Media.DATE_MODIFIED
                )

                reactContext.contentResolver.query(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    null,
                    null,
                    "${MediaStore.Images.Media.DATE_MODIFIED} DESC"
                )?.use { cursor ->
                    val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                    val bucketCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.BUCKET_DISPLAY_NAME)
                    val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_MODIFIED)

                    while (cursor.moveToNext()) {
                        val id = cursor.getLong(idCol)
                        val bucket = cursor.getString(bucketCol) ?: "Default"
                        val date = cursor.getLong(dateCol)
                        val uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id).toString()

                        if (!albumMap.containsKey(bucket)) {
                            albumMap[bucket] = Triple(1, uri, date)
                        } else {
                            val current = albumMap[bucket]!!
                            albumMap[bucket] = Triple(current.first + 1, current.second, current.third)
                        }
                    }
                }

                val albumArray = Arguments.createArray()
                for ((name, data) in albumMap) {
                    val map = Arguments.createMap().apply {
                        putString("name", name)
                        putInt("count", data.first)
                        putString("coverUri", data.second)
                    }
                    albumArray.pushMap(map)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(albumArray)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("ALBUMS_FETCH_ERROR", e.message, e)
                }
            }
        }
    }

    /**
     * Native streaming upload directly from Android ContentResolver to Desktop Sync Server.
     * Prevents OOM by using buffer streaming over HTTP.
     */
    @ReactMethod
    fun uploadMediaToDesktop(
        contentUriStr: String,
        targetUrl: String,
        fileName: String,
        contentHash: String,
        promise: Promise
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            var connection: HttpURLConnection? = null
            var inputStream: InputStream? = null
            var outputStream: OutputStream? = null

            try {
                val uri = Uri.parse(contentUriStr)
                inputStream = reactContext.contentResolver.openInputStream(uri)
                    ?: throw Exception("Could not open input stream for $contentUriStr")

                val url = URL(targetUrl)
                connection = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 15000
                    readTimeout = 30000
                    setRequestProperty("Content-Type", "application/octet-stream")
                    setRequestProperty("X-Filename", fileName)
                    setRequestProperty("X-Content-Hash", contentHash)
                    setChunkedStreamingMode(65536)
                }

                outputStream = connection.outputStream
                val buffer = ByteArray(65536)
                var bytesRead: Int
                var totalBytesSent = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesSent += bytesRead
                }
                outputStream.flush()

                val responseCode = connection.responseCode
                if (responseCode in 200..299) {
                    withContext(Dispatchers.Main) {
                        val result = Arguments.createMap().apply {
                            putBoolean("success", true)
                            putDouble("bytesSent", totalBytesSent.toDouble())
                        }
                        promise.resolve(result)
                    }
                } else {
                    val errorMsg = connection.errorStream?.bufferedReader()?.readText() ?: "HTTP error $responseCode"
                    throw Exception("Upload failed with code $responseCode: $errorMsg")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("UPLOAD_FAILED", e.message, e)
                }
            } finally {
                try { inputStream?.close() } catch (_: Exception) {}
                try { outputStream?.close() } catch (_: Exception) {}
                try { connection?.disconnect() } catch (_: Exception) {}
            }
        }
    }
}

