package com.example.myfavoritequotes.ui.quotes

import androidx.lifecycle.*
import com.example.myfavoritequotes.data.datastore.SettingsDataStore
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.data.repository.QuoteRepository
import kotlinx.coroutines.launch

class QuotesListViewModel(
    private val repository: QuoteRepository,
    private val dataStore: SettingsDataStore
) : ViewModel() {

    val allQuotes: LiveData<List<Quote>> = repository.allQuotes.asLiveData()

    fun toggleFavorite(quote: Quote) {
        viewModelScope.launch {
            if (quote.isFavorite) {
                // Un-favorite: clear all favorites and DataStore
                repository.clearAllFavorites()
                dataStore.clearFavoriteQuoteId()
            } else {
                // Set as favorite: only one favorite at a time
                repository.setFavorite(quote.id)
                dataStore.saveFavoriteQuoteId(quote.id)
            }
        }
    }

    fun deleteQuote(quote: Quote) {
        viewModelScope.launch {
            if (quote.isFavorite) {
                dataStore.clearFavoriteQuoteId()
            }
            repository.deleteQuote(quote)
        }
    }
}

class QuotesListViewModelFactory(
    private val repository: QuoteRepository,
    private val dataStore: SettingsDataStore
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(QuotesListViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return QuotesListViewModel(repository, dataStore) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
