package com.example.myfavoritequotes.data.remote.model

import com.google.gson.annotations.SerializedName

data class ApiQuote(
    @SerializedName("quote")
    val quote: String,
    @SerializedName("author")
    val author: String,
    @SerializedName("work")
    val work: String?,
    @SerializedName("categories")
    val categories: List<String>?
)
