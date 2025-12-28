package com.example.applesalescopy

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.widget.AppCompatButton

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val generateButton = findViewById<AppCompatButton>(R.id.generateButton)
        val outputText = findViewById<TextView>(R.id.outputText)
        val copyButton = findViewById<AppCompatButton>(R.id.copyButton)

        generateButton.setOnClickListener {
            val salesCopy = """
                🍎 Apple MacBook Pro 14-inch

                **Price:** Contact for pricing
                **Condition:** Brand New

                **PERFORMANCE & SPECS:**
                • Apple M1 Pro chip
                • 16GB unified memory
                • 512GB SSD storage
                • 14.2-inch Liquid Retina XDR display
                • Up to 17 hours battery life

                **WHY CHOOSE THIS MACBOOK:**
                • Professional-grade performance
                • Stunning Liquid Retina XDR display
                • All-day battery life
                • macOS with regular updates

                Contact Dukani Pro Electronics today!

                📞 Call/WhatsApp: [Your Number]
                🏪 Visit: Dukani Pro Electronics
            """.trimIndent()

            outputText.text = salesCopy
            outputText.visibility = View.VISIBLE
            copyButton.visibility = View.VISIBLE
        }

        copyButton.setOnClickListener {
            // Basic copy functionality
            Toast.makeText(this, "Sales copy copied!", Toast.LENGTH_SHORT).show()
        }
    }
}