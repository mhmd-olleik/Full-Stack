package com.example.myfavoritequotes.ui.addquote

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.example.myfavoritequotes.MyApp
import com.example.myfavoritequotes.data.datastore.SettingsDataStore
import com.example.myfavoritequotes.data.local.entity.Quote
import com.example.myfavoritequotes.data.repository.QuoteRepository
import com.example.myfavoritequotes.databinding.FragmentAddQuoteBinding

class AddQuoteFragment : Fragment() {

    private var _binding: FragmentAddQuoteBinding? = null
    private val binding get() = _binding!!

    private val viewModel: AddQuoteViewModel by viewModels {
        val app = requireActivity().application as MyApp
        val repository = QuoteRepository(app.database.quoteDao())
        val dataStore = SettingsDataStore(requireContext())
        AddQuoteViewModelFactory(repository, dataStore)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAddQuoteBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnSaveQuote.setOnClickListener {
            val quoteText = binding.etQuoteText.text.toString().trim()
            val authorName = binding.etAuthorName.text.toString().trim()
            val isFavorite = binding.cbSetFavorite.isChecked

            if (quoteText.isEmpty()) {
                binding.tilQuoteText.error = "Please enter a quote"
                return@setOnClickListener
            }
            if (authorName.isEmpty()) {
                binding.tilAuthorName.error = "Please enter an author name"
                return@setOnClickListener
            }

            binding.tilQuoteText.error = null
            binding.tilAuthorName.error = null

            val quote = Quote(
                text = quoteText,
                author = authorName,
                isFavorite = isFavorite
            )

            viewModel.insertQuote(quote, isFavorite)

            // Clear fields
            binding.etQuoteText.text?.clear()
            binding.etAuthorName.text?.clear()
            binding.cbSetFavorite.isChecked = false

            Toast.makeText(requireContext(), "Quote saved successfully!", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
