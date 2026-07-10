package com.example.myfavoritequotes.ui.quotes

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.myfavoritequotes.MyApp
import com.example.myfavoritequotes.data.datastore.SettingsDataStore
import com.example.myfavoritequotes.data.repository.QuoteRepository
import com.example.myfavoritequotes.databinding.FragmentQuotesListBinding

class QuotesListFragment : Fragment() {

    private var _binding: FragmentQuotesListBinding? = null
    private val binding get() = _binding!!

    private val viewModel: QuotesListViewModel by viewModels {
        val app = requireActivity().application as MyApp
        val repository = QuoteRepository(app.database.quoteDao())
        val dataStore = SettingsDataStore(requireContext())
        QuotesListViewModelFactory(repository, dataStore)
    }

    private lateinit var adapter: QuoteAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentQuotesListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = QuoteAdapter(
            onFavoriteClick = { quote ->
                viewModel.toggleFavorite(quote)
            },
            onDeleteClick = { quote ->
                viewModel.deleteQuote(quote)
            }
        )

        binding.rvQuotes.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@QuotesListFragment.adapter
        }

        viewModel.allQuotes.observe(viewLifecycleOwner) { quotes ->
            adapter.submitList(quotes)
            binding.tvEmptyState.visibility =
                if (quotes.isEmpty()) View.VISIBLE else View.GONE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
