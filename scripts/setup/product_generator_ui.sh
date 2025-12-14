#!/bin/bash

# Interactive Product Generator UI
# User-friendly interface for generating product catalogs

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Clear screen and show header
clear
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${WHITE}                    📱 PRODUCT GENERATOR UI${BLUE}                    ║${NC}"
echo -e "${BLUE}║${CYAN}              Create Product Catalogs Instantly${BLUE}                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Main menu function
show_main_menu() {
    echo -e "${YELLOW}Choose what you want to generate:${NC}"
    echo ""
    echo -e "${GREEN}1)${NC} Samsung Galaxy S Series (39 products)"
    echo -e "${GREEN}2)${NC} iPhone 17 Series (14 products)"
    echo -e "${GREEN}3)${NC} Both Samsung & iPhone (53 products total)"
    echo -e "${GREEN}4)${NC} Custom Device Series (Type your own!)"
    echo -e "${GREEN}5)${NC} View Generated Files"
    echo -e "${GREEN}6)${NC} Help & Information"
    echo -e "${RED}7)${NC} Exit"
    echo ""
}

# File status check function
check_files() {
    echo -e "${CYAN}📊 Checking generated files...${NC}"
    echo ""

    if [ -f "samsung_products.csv" ]; then
        samsung_count=$(wc -l < samsung_products.csv)
        samsung_count=$((samsung_count - 1)) # Subtract header
        echo -e "${GREEN}✅ Samsung products:${NC} ${samsung_count} products (${YELLOW}samsung_products.csv${NC})"
    else
        echo -e "${RED}❌ Samsung products:${NC} Not generated yet"
    fi

    if [ -f "iphone_products.csv" ]; then
        iphone_count=$(wc -l < iphone_products.csv)
        iphone_count=$((iphone_count - 1)) # Subtract header
        echo -e "${GREEN}✅ iPhone products:${NC} ${iphone_count} products (${YELLOW}iphone_products.csv${NC})"
    else
        echo -e "${RED}❌ iPhone products:${NC} Not generated yet"
    fi

    echo ""
}

# Generation success message
show_success() {
    echo ""
    echo -e "${GREEN}✅ Generation completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}📁 Files created:${NC}"
    [ -f "samsung_products.csv" ] && echo -e "   • ${YELLOW}samsung_products.csv${NC} ($(wc -l < samsung_products.csv) lines)"
    [ -f "iphone_products.csv" ] && echo -e "   • ${YELLOW}iphone_products.csv${NC} ($(wc -l < iphone_products.csv) lines)"
    echo ""
    echo -e "${PURPLE}💡 Tip: Upload the CSV files to your inventory import feature${NC}"
    echo ""
}

# Help function
show_help() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${WHITE}                          HELP & INFO${BLUE}                         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${CYAN}🎯 How to Use:${NC}"
    echo -e "   Select options from the main menu using numbers 1-6"
    echo ""
    echo -e "${CYAN}📱 Product Catalogs:${NC}"
    echo -e "   • ${GREEN}Samsung:${NC} Galaxy S21-S25 series with all storage variants"
    echo -e "   • ${GREEN}iPhone:${NC} iPhone 17 series with Apple-standard storage"
    echo ""
    echo -e "${CYAN}📊 What's Included:${NC}"
    echo -e "   • Complete technical specifications"
    echo -e "   • All storage variants (128GB, 256GB, 512GB, 1TB)"
    echo -e "   • Special features (AI, cameras, S Pen, etc.)"
    echo -e "   • Import-ready CSV format"
    echo ""
    echo -e "${CYAN}🔄 Re-generation:${NC}"
    echo -e "   • Safe to run multiple times"
    echo -e "   • Files are overwritten automatically"
    echo ""
    echo -e "${CYAN}📁 Output Location:${NC}"
    echo -e "   • samsung_products.csv"
    echo -e "   • iphone_products.csv"
    echo ""
}

# Main loop
while true; do
    show_main_menu
    echo -ne "${YELLOW}Enter your choice (1-7): ${NC}"
    read choice

    case $choice in
        1)
            clear
            echo -e "${BLUE}📱 Generating Samsung Galaxy S Series...${NC}"
            echo ""
            ./generate_samsung_products.sh
            show_success
            echo -ne "${YELLOW}Press Enter to continue...${NC}"
            read
            clear
            ;;
        2)
            clear
            echo -e "${BLUE}📱 Generating iPhone 17 Series...${NC}"
            echo ""
            ./generate_iphone_products.sh
            show_success
            echo -ne "${YELLOW}Press Enter to continue...${NC}"
            read
            clear
            ;;
        3)
            clear
            echo -e "${BLUE}📱 Generating Both Samsung & iPhone Catalogs...${NC}"
            echo ""
            echo -e "${CYAN}Step 1: Samsung Galaxy S Series${NC}"
            ./generate_samsung_products.sh
            echo ""
            echo -e "${CYAN}Step 2: iPhone 17 Series${NC}"
            ./generate_iphone_products.sh
            echo ""
            echo -e "${GREEN}✅ Both catalogs generated successfully!${NC}"
            echo ""
            echo -e "${CYAN}📁 Files created:${NC}"
            [ -f "samsung_products.csv" ] && echo -e "   • ${YELLOW}samsung_products.csv${NC} ($(wc -l < samsung_products.csv) lines)"
            [ -f "iphone_products.csv" ] && echo -e "   • ${YELLOW}iphone_products.csv${NC} ($(wc -l < iphone_products.csv) lines)"
            echo ""
            echo -e "${PURPLE}💡 Tip: Upload both CSV files to your inventory system${NC}"
            echo ""
            echo -ne "${YELLOW}Press Enter to continue...${NC}"
            read
            clear
            ;;
        4)
            clear
            echo -e "${BLUE}🎨 Custom Device Series Generator${NC}"
            echo ""
            echo -e "${YELLOW}Enter the device series you want to create:${NC}"
            echo -e "${CYAN}Examples: 'Google Pixel 9', 'OnePlus 12', 'Sony Xperia 5', 'Huawei P60'${NC}"
            echo ""
            echo -ne "${GREEN}Device name: ${NC}"
            read custom_device

            if [ -z "$custom_device" ]; then
                echo -e "${RED}❌ No device name entered. Returning to menu...${NC}"
                sleep 2
                clear
                continue
            fi

            echo ""
            echo -e "${CYAN}Generating products for: ${YELLOW}$custom_device${NC}"
            echo ""

            # Create custom device CSV
            custom_filename=$(echo "$custom_device" | tr ' ' '_' | tr '[:upper:]' '[:lower:]').csv

            cat > "$custom_filename" << EOF
Product Name,Category Name,Supplier Name,Price,Cost Price,Stock Quantity,Min Stock Level,Specification,Variant Name,Variant Quantity,Variant Min Quantity
$custom_device,Smartphones,,0,0,0,0,"Premium smartphone with advanced features",128GB Storage,0,0
$custom_device,Smartphones,,0,0,0,0,"Premium smartphone with advanced features",256GB Storage,0,0
$custom_device,Smartphones,,0,0,0,0,"Premium smartphone with advanced features",512GB Storage,0,0
EOF

            echo -e "${GREEN}✅ Custom device catalog created!${NC}"
            echo ""
            echo -e "${CYAN}📁 File created:${NC} ${YELLOW}$custom_filename${NC} (4 products)"
            echo ""
            echo -e "${PURPLE}💡 Tip: Edit the CSV file to add detailed specifications and more storage variants${NC}"
            echo ""
            echo -ne "${YELLOW}Press Enter to continue...${NC}"
            read
            clear
            ;;
        5)
            clear
            echo -e "${BLUE}📊 Generated Files Status${NC}"
            echo ""
            check_files
            echo -ne "${YELLOW}Press Enter to continue...${NC}"
            read
            clear
            ;;
        6)
            show_help
            echo -ne "${YELLOW}Press Enter to return to main menu...${NC}"
            read
            clear
            ;;
        7)
            clear
            echo -e "${GREEN}👋 Thank you for using Product Generator UI!${NC}"
            echo -e "${CYAN}Files are ready for import into your inventory system.${NC}"
            echo ""
            exit 0
            ;;
        *)
            clear
            echo -e "${RED}❌ Invalid option. Please choose 1-7.${NC}"
            echo ""
            sleep 2
            clear
            ;;
    esac
done
