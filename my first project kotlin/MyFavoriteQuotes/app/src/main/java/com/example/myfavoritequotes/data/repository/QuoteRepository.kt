package com.example.myfavoritequotes.data.repository

import com.example.myfavoritequotes.data.local.dao.QuoteDao
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.data.remote.api.RetrofitClient
import com.example.myfavoritequotes.data.remote.model.ApiQuote
import kotlinx.coroutines.flow.Flow

class QuoteRepository(private val quoteDao: QuoteDao) {

    val allQuotes: Flow<List<Quote>> = quoteDao.getAllQuotes()

    suspend fun insertQuote(quote: Quote): Long {
        return quoteDao.insertQuote(quote)
    }

    suspend fun updateQuote(quote: Quote) {
        quoteDao.updateQuote(quote)
    }

    suspend fun deleteQuote(quote: Quote) {
        quoteDao.deleteQuote(quote)
    }

    suspend fun getQuoteById(id: Int): Quote? {
        return quoteDao.getQuoteById(id)
    }

    suspend fun setFavorite(quoteId: Int) {
        quoteDao.clearAllFavorites()
        quoteDao.setFavorite(quoteId)
    }

    suspend fun clearAllFavorites() {
        quoteDao.clearAllFavorites()
    }

    suspend fun deleteAllQuotes() {
        quoteDao.deleteAllQuotes()
    }

    suspend fun getFavoriteQuote(): Quote? {
        return quoteDao.getFavoriteQuote()
    }

    suspend fun getRandomQuoteFromApi(): List<ApiQuote> {
        return RetrofitClient.apiService.getRandomQuote()
    }
}
