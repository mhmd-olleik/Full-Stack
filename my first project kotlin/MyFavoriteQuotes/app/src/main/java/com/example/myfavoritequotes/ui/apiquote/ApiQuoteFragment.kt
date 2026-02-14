package com.example.myfavoritequotes.ui.apiquote

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.example.myfavoritequotes.MyApp
import com.example.myfavoritequotes.data.repository.QuoteRepository
import com.example.myfavoritequotes.databinding.FragmentApiQuoteBinding

class ApiQuoteFragment : Fragment() {

    private var _binding: FragmentApiQuoteBinding? = null
    private val binding get() = _binding!!

    private val viewModel: ApiQuoteViewModel by viewModels {
        val app = requireActivity().application as MyApp
        val repository = QuoteRepository(app.database.quoteDao())
        ApiQuoteViewModelFactory(repository)
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentApiQuoteBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel.apiQuote.observe(viewLifecycleOwner) { quote ->
            if (quote != null) {
                binding.tvApiQuoteText.text = "\"${quote.quote}\""
                binding.tvApiQuoteAuthor.text = "— ${quote.author}"
                binding.cardQuote.visibility = View.VISIBLE
            }
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.fabGetQuote.isEnabled = !isLoading
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            if (error != null) {
                Toast.makeText(requireContext(), error, Toast.LENGTH_LONG).show()
            }
        }

        viewModel.savedMessage.observe(viewLifecycleOwner) { message ->
            if (message != null) {
                Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
            }
        }

        binding.fabGetQuote.setOnClickListener {
            viewModel.fetchRandomQuote()
        }

        binding.btnSaveApiQuote.setOnClickListener {
            viewModel.saveCurrentQuote()
        }

        // Fetch initial quote
        viewModel.fetchRandomQuote()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
