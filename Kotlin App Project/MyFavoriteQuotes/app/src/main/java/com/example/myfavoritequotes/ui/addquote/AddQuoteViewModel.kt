package com.example.myfavoritequotes.ui.addquote

import androidx.lifecycle.*
import com.example.myfavoritequotes.data.datastore.SettingsDataStore
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.data.repository.QuoteRepository
import kotlinx.coroutines.launch

class AddQuoteViewModel(
    private val repository: QuoteRepository,
    private val dataStore: SettingsDataStore
) : ViewModel() {

    fun insertQuote(quote: Quote, setAsFavorite: Boolean) {
        viewModelScope.launch {
            val id = repository.insertQuote(quote)
            if (setAsFavorite) {
                repository.setFavorite(id.toInt())
                dataStore.saveFavoriteQuoteId(id.toInt())
            }
        }
    }
}

class AddQuoteViewModelFactory(
    private val repository: QuoteRepository,
    private val dataStore: SettingsDataStore
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AddQuoteViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AddQuoteViewModel(repository, dataStore) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
