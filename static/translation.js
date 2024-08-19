        // Fetch available languages from the server
        function loadAvailableLanguages() {
            fetch('/api/translations')
                .then(response => response.json())
                .then(languages => {
                    const languageSelector = document.getElementById('language-selector');
                    languageSelector.innerHTML = ''; // Clear existing options

                    // Add languages as options
                    languages.forEach(lang => {
                        const option = document.createElement('option');
                        option.value = lang;
                        option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1); // Capitalize first letter
                        languageSelector.appendChild(option);
                    });

                    // Load default language (first available)
                    const defaultLang = languages[0];
                    loadTranslation(defaultLang);
                })
                .catch(error => {
                    console.error('Error loading languages:', error);
                });
        }

        // Load the translation file for the selected language
        function loadTranslation(language) {
            fetch(`/static/translations/${language}.json`)
                .then(response => response.json())
                .then(translation => {
                    document.getElementById('add_item').textContent = translation.add_item;
                    document.getElementById('search').setAttribute('placeholder', translation.search);
                    
                    // Übersetzte Tooltips setzen
                    document.getElementById('sortingMethods_text').setAttribute('title', translation.sortingMethods_text);
                    document.getElementById('sortingBytags_text').setAttribute('title', translation.sortingBytags_text);
                    document.getElementById('plus-btn-inventur').setAttribute('title', translation.plus_btn_label);
                    document.getElementById('minus-btn-inventur').setAttribute('title', translation.minus_btn_label);
                    document.getElementById('edit-btn-inventur').setAttribute('title', translation.edit_btn_label);
                    document.getElementById('continue-btn-inventur').setAttribute('title', translation.continue_btn_label);
                    // Bootstrap-Tooltips neu initialisieren
                    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
                        new bootstrap.Tooltip(tooltipTriggerEl);
                    });

                //Settings Page
                    document.getElementById('offcanvasSettingsLabel').textContent = translation.offcanvasSettingsLabel;
                    document.getElementById('leds_text').textContent = translation.leds_text;
                    document.getElementById('on_btn_label').textContent = translation.on_btn_label;
                    document.getElementById('off_btn_label').textContent = translation.off_btn_label;
                    document.getElementById('party_btn_label').textContent = translation.party_btn_label;
                    document.getElementById('brightness-title').textContent = translation.settings_brightness;
                    document.getElementById('timeout-title').textContent = translation.settings_timeout;
                    
                    //document.getElementById('locate_led_color_label').textContent = translation.locate_led_color;
                    //document.getElementById('standby_led_color_label').textContent = translation.standby_led_color;
                    
                    document.getElementById('esp_devices_text').textContent = translation.esp_devices_text;
                    document.getElementById('add_esp_button').textContent = translation.add_esp_button;
                    
                    //Light&Dark Modes
                    document.getElementById('titile').textContent = translation.webinterface_label;
                    document.getElementById('light_mode_label').textContent = translation.light_mode_label;
                    document.getElementById('dark_mode_label').textContent = translation.dark_mode_label;
                    document.getElementById('auto_mode_label').textContent = translation.auto_mode_label;
                    
                    //Inventur Box
                    document.getElementById('inventur_btn_label').textContent = translation.inventur_btn_label;
                    document.getElementById('inventur_label').textContent = translation.inventur_btn_label;
                    document.getElementById('inventur_box_label').textContent = translation.inventur_btn_label;
                    document.getElementById('edit_inventur_btn_label').textContent = translation.edit_btn_label;
                    document.getElementById('continue_inventur_btn_label').textContent = translation.continue_btn_label;
                    document.getElementById('cancel_inventur_btn_label').textContent = translation.cancel_btn_label;
                    document.getElementById('save_inventur_btn_label').textContent = translation.save_btn_label;
                    //Language Selector
                    document.getElementById('language_selector_label').textContent = translation.language_label;
                    
                    //Add Item Box
                    document.getElementById('item_name_label').textContent = translation.add_item;
                    document.getElementById('item-modal-label').textContent = translation.add_item;
                    document.getElementById('item_url_label').textContent = translation.item_url_label; 
                    document.getElementById('item_quantity_label').textContent = translation.item_quantity_label;  
                    document.getElementById('item_imageUrl_label').textContent = translation.item_imageUrl_label;  
                    document.getElementById('item_imageUplad_label').textContent = translation.item_imageUplad_label;
                    document.getElementById('item_tag_label').textContent = translation.item_tag_label;
                    document.getElementById('item_esp_select_label').textContent = translation.item_select_esp_label;
                    document.getElementById('test_led_btn_label').textContent = translation.test_led_btn_label;
                    document.getElementById('clear_grid_btn_label').textContent = translation.clear_grid_btn_label;
                    document.getElementById('item_select_leds_label').textContent = translation.item_select_leds_label;
                    document.getElementById('item_cancel_btn_label').textContent = translation.cancel_btn_label;
                    document.getElementById('item_add_btn_label').textContent = translation.add_btn_label;
                    
                    //Add ESP BOX
                    document.getElementById('left_label').textContent = translation.left_label;
                    document.getElementById('right_label').textContent = translation.right_label;
                    document.getElementById('start_left_label').textContent = translation.start_left_label;
                    document.getElementById('top_label').textContent = translation.top_label;
                    document.getElementById('bottom_label').textContent = translation.bottom_label;
                    document.getElementById('start_top_label').textContent = translation.start_top_label;
                    document.getElementById('horizontal_label').textContent = translation.horizontal_label;
                    document.getElementById('vertical_label').textContent = translation.vertical_label;
                    document.getElementById('serpentine_dir_label').textContent = translation.serpentine_dir_label;
                    document.getElementById('esp-modal-label').textContent = translation.add_esp_label;
                    document.getElementById('esp_name_text').textContent = translation.esp_name_text;
                    document.getElementById('esp_ip_text').textContent = translation.esp_ip_text;
                    document.getElementById('esp_rows_text').textContent = translation.esp_rows_text;
                    document.getElementById('esp_columns_text').textContent = translation.esp_columns_text;
                    document.getElementById('cancel_esp_btn_label').textContent = translation.cancel_btn_label;
                    document.getElementById('add_esp_btn_label').textContent = translation.add_btn_label;
                    
                    
                    document.getElementById('cropAndSaveBtn').textContent = translation.cropAndSaveBtn;
                    document.getElementById('cropCancel').textContent = translation.cancel_btn_label;
                    document.getElementById('cropImageModalLabel').textContent = translation.cropImageModalLabel;
                    document.getElementById('espDeleteModalLabel').textContent = translation.espDeleteModalLabel;
                    document.getElementById('sortBybox').textContent = translation.sortBybox;
                    document.getElementById('sortByid').textContent = translation.sortByid;
                    document.getElementById('sortByname').textContent = translation.sortByname;
                    document.getElementById('sortByquantity').textContent = translation.sortByquantity;
                    document.getElementById('sortBylocation').textContent = translation.sortBylocation;
                    



                })
                .catch(error => {
                    console.error('Error loading translation:', error);
                });
        }

        // Event listener for language selection
        document.getElementById('language-selector').addEventListener('change', function() {
            const selectedLanguage = this.value;
            loadTranslation(selectedLanguage);
        });

        // Load available languages on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadAvailableLanguages();
        });