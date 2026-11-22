package com.kairema.app.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * API-ключи провайдеров. Шифруются AES-GCM, главный ключ лежит в Android Keystore
 * и не покидает защищённое хранилище. В интерфейс (JS) ключи не передаются никогда.
 */
object SecureKeys {
    private const val ALIAS = "kairema_master"
    private const val PREFS = "kairema_keys"

    private fun masterKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(
                ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return gen.generateKey()
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(ctx: Context, id: String, secret: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, masterKey())
        val encrypted = cipher.doFinal(secret.toByteArray(Charsets.UTF_8))
        val blob = Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)
        prefs(ctx).edit().putString(id, blob).apply()
    }

    fun load(ctx: Context, id: String): String? = try {
        val blob = prefs(ctx).getString(id, null)
        if (blob == null) {
            null
        } else {
            val raw = Base64.decode(blob, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, masterKey(), GCMParameterSpec(128, raw.copyOfRange(0, 12)))
            String(cipher.doFinal(raw.copyOfRange(12, raw.size)), Charsets.UTF_8)
        }
    } catch (_: Exception) {
        null
    }

    fun delete(ctx: Context, id: String) {
        prefs(ctx).edit().remove(id).apply()
    }
}
