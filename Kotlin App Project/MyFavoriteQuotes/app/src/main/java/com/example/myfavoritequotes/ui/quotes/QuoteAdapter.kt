package com.example.myfavoritequotes.ui.quotes

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.myfavoritequotes.R
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.databinding.ItemQuoteBinding

class QuoteAdapter(
    private val onFavoriteClick: (Quote) -> Unit,
    private val onDeleteClick: (Quote) -> Unit
) : ListAdapter<Quote, QuoteAdapter.QuoteViewHolder>(QuoteDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): QuoteViewHolder {
        val binding = ItemQuoteBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return QuoteViewHolder(binding)
    }

    override fun onBindViewHolder(holder: QuoteViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class QuoteViewHolder(
        private val binding: ItemQuoteBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(quote: Quote) {
            binding.tvQuoteText.text = "\"${quote.text}\""
            binding.tvAuthorName.text = "— ${quote.author}"

            // Set favorite icon
            binding.btnFavorite.setImageResource(
                if (quote.isFavorite) R.drawable.ic_favorite_filled
                else R.drawable.ic_favorite_border
            )

            binding.btnFavorite.setOnClickListener {
                onFavoriteClick(quote)
            }

            binding.btnDelete.setOnClickListener {
                onDeleteClick(quote)
            }
        }
    }
}

class QuoteDiffCallback : DiffUtil.ItemCallback<Quote>() {
    override fun areItemsTheSame(oldItem: Quote, newItem: Quote): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: Quote, newItem: Quote): Boolean {
        return oldItem == newItem
    }
}
