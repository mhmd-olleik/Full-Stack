package com.example.myfavoritequotes.ui.settings

import androidx.lifecycle.*
import com.example.myfavoritequotes.data.datastore.SettingsDataStore
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.data.repository.QuoteRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val repository: QuoteRepository,
    private val dataStore: SettingsDataStore
) : ViewModel() {

    private val _favoriteQuote = MutableLiveData<Quote?>()
    val favoriteQuote: LiveData<Quote?> = _favoriteQuote

    val isDarkMode: LiveData<Boolean> = dataStore.isDarkMode.asLiveData()

    private val _exportedQuotes = MutableLiveData<String?>()
    val exportedQuotes: LiveData<String?> = _exportedQuotes

    fun loadFavoriteQuote() {
        viewModelScope.launch {
            val favoriteId = dataStore.favoriteQuoteId.first()
            if (favoriteId != -1) {
                val quote = repository.getQuoteById(favoriteId)
                _favoriteQuote.value = quote
            } else {
                _favoriteQuote.value = null
            }
        }
    }

    fun setDarkMode(isDark: Boolean) {
        viewModelScope.launch {
            dataStore.saveDarkMode(isDark)
        }
    }

    fun clearAllQuotes() {
        viewModelScope.launch {
            repository.deleteAllQuotes()
            dataStore.clearFavoriteQuoteId()
            _favoriteQuote.value = null
        }
    }

    fun exportQuotes() {
        viewModelScope.launch {
            val quotes = repository.allQuotes.first()
            if (quotes.isEmpty()) {
                _exportedQuotes.value = null
                return@launch
            }
            val sb = StringBuilder()
            sb.appendLine("═══════════════════════════════════")
            sb.appendLine("     MY FAVORITE QUOTES")
            sb.appendLine("═══════════════════════════════════")
            sb.appendLine()
            quotes.forEachIndexed { index, quote ->
                sb.appendLine("${index + 1}. \"${quote.text}\"")
                sb.appendLine("   — ${quote.author}")
                if (quote.isFavorite) {
                    sb.appendLine("   ❤️ Favorite")
                }
                sb.appendLine()
            }
            sb.appendLine("═══════════════════════════════════")
            sb.appendLine("Total quotes: ${quotes.size}")
            _exportedQuotes.value = sb.toString()
        }
    }
}

class SettingsViewModelFactory(
    private val repository: QuoteRepository,
    private val dataStore: SettingsDataStore
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(SettingsViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return SettingsViewModel(repository, dataStore) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
