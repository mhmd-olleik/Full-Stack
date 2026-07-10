package com.example.myfavoritequotes.data.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsDataStore(private val context: Context) {

    companion object {
        val FAVORITE_QUOTE_ID = intPreferencesKey("favorite_quote_id")
        val IS_DARK_MODE = booleanPreferencesKey("is_dark_mode")
    }

    val favoriteQuoteId: Flow<Int> = context.dataStore.data.map { preferences ->
        preferences[FAVORITE_QUOTE_ID] ?: -1
    }

    val isDarkMode: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[IS_DARK_MODE] ?: false
    }

    suspend fun saveFavoriteQuoteId(id: Int) {
        context.dataStore.edit { preferences ->
            preferences[FAVORITE_QUOTE_ID] = id
        }
    }

    suspend fun saveDarkMode(isDark: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[IS_DARK_MODE] = isDark
        }
    }

    suspend fun clearFavoriteQuoteId() {
        context.dataStore.edit { preferences ->
            preferences.remove(FAVORITE_QUOTE_ID)
        }
    }
}
