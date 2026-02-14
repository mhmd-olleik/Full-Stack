package com.example.myfavoritequotes.data.local.dao

import androidx.room.*
import com.example.myfavoritequotes.data.local.entity.Quote
import kotlinx.coroutines.flow.Flow

@Dao
interface QuoteDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertQuote(quote: Quote): Long

    @Update
    suspend fun updateQuote(quote: Quote)

    @Delete
    suspend fun deleteQuote(quote: Quote)

    @Query("SELECT * FROM quotes ORDER BY id DESC")
    fun getAllQuotes(): Flow<List<Quote>>

    @Query("SELECT * FROM quotes WHERE id = :id")
    suspend fun getQuoteById(id: Int): Quote?

    @Query("UPDATE quotes SET isFavorite = 0")
    suspend fun clearAllFavorites()

    @Query("UPDATE quotes SET isFavorite = 1 WHERE id = :id")
    suspend fun setFavorite(id: Int)

    @Query("DELETE FROM quotes")
    suspend fun deleteAllQuotes()

    @Query("SELECT * FROM quotes WHERE isFavorite = 1 LIMIT 1")
    suspend fun getFavoriteQuote(): Quote?
}
