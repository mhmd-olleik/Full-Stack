package com.example.myfavoritequotes.ui.settings

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.example.myfavoritequotes.MyApp
import com.example.myfavoritequotes.data.datastore.SettingsDataStore
import com.example.myfavoritequotes.data.repository.QuoteRepository
import com.example.myfavoritequotes.databinding.FragmentSettingsBinding
import java.io.File
import java.io.FileWriter

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: SettingsViewModel by viewModels {
        val app = requireActivity().application as MyApp
        val repository = QuoteRepository(app.database.quoteDao())
        val dataStore = SettingsDataStore(requireContext())
        SettingsViewModelFactory(repository, dataStore)
    }

    private val requestPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                viewModel.exportQuotes()
            } else {
                Toast.makeText(requireContext(), "Permission denied", Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Observe favorite quote
        viewModel.favoriteQuote.observe(viewLifecycleOwner) { quote ->
            if (quote != null) {
                binding.tvFavoriteQuoteText.text = "\"${quote.text}\""
                binding.tvFavoriteQuoteAuthor.text = "— ${quote.author}"
                binding.cardFavoriteQuote.visibility = View.VISIBLE
                binding.tvNoFavorite.visibility = View.GONE
            } else {
                binding.cardFavoriteQuote.visibility = View.GONE
                binding.tvNoFavorite.visibility = View.VISIBLE
            }
        }

        // Observe dark mode
        viewModel.isDarkMode.observe(viewLifecycleOwner) { isDark ->
            binding.switchDarkMode.isChecked = isDark
        }

        // Dark mode toggle
        binding.switchDarkMode.setOnCheckedChangeListener { _, isChecked ->
            viewModel.setDarkMode(isChecked)
            AppCompatDelegate.setDefaultNightMode(
                if (isChecked) AppCompatDelegate.MODE_NIGHT_YES
                else AppCompatDelegate.MODE_NIGHT_NO
            )
        }

        // Clear all quotes
        binding.btnClearAllQuotes.setOnClickListener {
            viewModel.clearAllQuotes()
            Toast.makeText(requireContext(), "All quotes cleared!", Toast.LENGTH_SHORT).show()
        }

        // Export quotes
        binding.btnExportQuotes.setOnClickListener {
            handleExportQuotes()
        }

        // Observe export result
        viewModel.exportedQuotes.observe(viewLifecycleOwner) { quotes ->
            if (quotes != null && quotes.isNotEmpty()) {
                saveQuotesToFile(quotes)
            }
        }

        // Load settings
        viewModel.loadFavoriteQuote()
    }

    private fun handleExportQuotes() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ - use READ_MEDIA_IMAGES
            if (ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.READ_MEDIA_IMAGES
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                viewModel.exportQuotes()
            } else {
                requestPermissionLauncher.launch(Manifest.permission.READ_MEDIA_IMAGES)
            }
        } else {
            // Below Android 13
            if (ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                viewModel.exportQuotes()
            } else {
                requestPermissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
            }
        }
    }

    private fun saveQuotesToFile(quotesText: String) {
        try {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            )
            val file = File(downloadsDir, "my_favorite_quotes.txt")
            FileWriter(file).use { writer ->
                writer.write(quotesText)
            }
            Toast.makeText(
                requireContext(),
                "Quotes exported to Downloads/my_favorite_quotes.txt",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Toast.makeText(
                requireContext(),
                "Failed to export: ${e.message}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
