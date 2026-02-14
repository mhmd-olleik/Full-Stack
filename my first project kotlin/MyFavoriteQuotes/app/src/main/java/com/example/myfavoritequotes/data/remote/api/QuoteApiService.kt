package com.example.myfavoritequotes.data.remote.api

import com.example.myfavoritequotes.data.remote.model.ApiQuote
import retrofit2.http.GET
import retrofit2.http.Query

interface QuoteApiService {

    @GET("v2/randomquotes")
    suspend fun getRandomQuote(
        @Query("categories") categories: String? = null
    ): List<ApiQuote>

    companion object {
        const val BASE_URL = "https://api.api-ninjas.com/"
    }
}
