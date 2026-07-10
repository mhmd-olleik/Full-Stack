package com.example.myfavoritequotes.ui.apiquote

import androidx.lifecycle.*
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.data.remote.model.ApiQuote
import com.example.myfavoritequotes.data.repository.QuoteRepository
import kotlinx.coroutines.launch

class ApiQuoteViewModel(
    private val repository: QuoteRepository
) : ViewModel() {

    private val _apiQuote = MutableLiveData<ApiQuote?>()
    val apiQuote: LiveData<ApiQuote?> = _apiQuote

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _savedMessage = MutableLiveData<String?>()
    val savedMessage: LiveData<String?> = _savedMessage

    fun fetchRandomQuote() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val quotes = repository.getRandomQuoteFromApi()
                _apiQuote.value = quotes.firstOrNull()
            } catch (e: Exception) {
                _error.value = "Failed to fetch quote: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun saveCurrentQuote() {
        val currentQuote = _apiQuote.value ?: return
        viewModelScope.launch {
            try {
                val quote = Quote(
                    text = currentQuote.quote,
                    author = currentQuote.author
                )
                repository.insertQuote(quote)
                _savedMessage.value = "Quote saved to your collection!"
            } catch (e: Exception) {
                _savedMessage.value = "Failed to save quote: ${e.message}"
            }
        }
    }
}

class ApiQuoteViewModelFactory(
    private val repository: QuoteRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ApiQuoteViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ApiQuoteViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
