package com.kairema.app.terminal

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Принимает результат команды от Termux и передаёт его в TermuxRunner. */
class TermuxResultReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(TermuxRunner.EXTRA_ID) ?: return
        TermuxRunner.deliver(id, intent.getBundleExtra("result"))
    }
}
