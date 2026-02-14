package com.example.myfavoritequotes.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quotes")
data class Quote(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val text: String,
    val author: String,
    val isFavorite: Boolean = false
)
