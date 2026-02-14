package com.example.myfavoritequotes

import android.app.Application
import com.example.myfavoritequotes.data.local.database.QuoteDatabase

class MyApp : Application() {

    val database: QuoteDatabase by lazy {
        QuoteDatabase.getDatabase(this)
    }
}
