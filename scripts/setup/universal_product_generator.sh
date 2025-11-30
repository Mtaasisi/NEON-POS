#!/bin/bash

# Universal Product Generator
# Generate product catalogs for any device series
# Usage: ./universal_product_generator.sh [samsung|iphone|help]

show_help() {
    echo "🚀 Universal Product Generator"
    echo ""
    echo "Usage:"
    echo "  ./universal_product_generator.sh samsung    # Generate Samsung Galaxy S series"
    echo "  ./universal_product_generator.sh iphone     # Generate iPhone 17 series"
    echo "  ./universal_product_generator.sh help       # Show this help"
    echo ""
    echo "Available generators:"
    echo "  - samsung: Samsung Galaxy S21-S25 series (39 products)"
    echo "  - iphone:  iPhone 17 series (14 products)"
    echo ""
    echo "Examples:"
    echo "  ./universal_product_generator.sh samsung"
    echo "  ./universal_product_generator.sh iphone"
}

case "$1" in
    "samsung")
        echo "📱 Generating Samsung Galaxy S Series..."
        ./generate_samsung_products.sh
        ;;
    "iphone")
        echo "📱 Generating iPhone 17 Series..."
        ./generate_iphone_products.sh
        ;;
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
