package com.kairema.app.share

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.File
import java.io.FileNotFoundException

/**
 * Отдаёт другим приложениям файлы из временной папки cache/share (только чтение).
 * Нужен для «Поделиться файлом»: Telegram и другие получают доступ только к этому файлу.
 */
class ShareFiles : ContentProvider() {

    override fun onCreate(): Boolean = true

    private fun resolve(uri: Uri): File? {
        val name = uri.lastPathSegment ?: return null
        val base = context?.cacheDir ?: return null
        val dir = File(base, DIR).canonicalFile
        val f = File(dir, name).canonicalFile
        return if (f.parentFile == dir && f.isFile) f else null
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        val f = resolve(uri) ?: throw FileNotFoundException(uri.toString())
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? {
        val f = resolve(uri) ?: return null
        val cols = arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)
        val c = MatrixCursor(cols)
        c.addRow(arrayOf<Any?>(f.name, f.length()))
        return c
    }

    override fun getType(uri: Uri): String? = when (uri.lastPathSegment?.substringAfterLast('.', "")?.lowercase()) {
        "html", "htm" -> "text/html"
        "md" -> "text/markdown"
        "csv" -> "text/csv"
        "txt" -> "text/plain"
        else -> "application/octet-stream"
    }

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0

    override fun update(
        uri: Uri,
        values: ContentValues?,
        selection: String?,
        selectionArgs: Array<out String>?
    ): Int = 0

    companion object {
        const val AUTHORITY = "com.kairema.app.files"
        const val DIR = "share"
    }
}
