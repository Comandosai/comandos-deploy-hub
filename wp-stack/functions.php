<?php

declare(strict_types=1);

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
    
    // КАСТОМНЫЕ РАЗМЕРЫ (Без жесткой обрезки для сохранения пропорций)
    add_image_size('comandos-thumb', 500, 281, false); 
    
    add_theme_support(
        'html5',
        [
            'search-form',
            'comment-form',
            'comment-list',
            'gallery',
            'caption',
            'style',
            'script',
        ]
    );

    // Регистрация областей меню
    register_nav_menus([
        'primary' => 'Основное меню (Primary Menu)',
    ]);
});

// AUTO-FIX: Создаем и назначаем меню, если оно отвалилось
add_action('init', function() {
    if (!has_nav_menu('primary')) {
        $menu_name = 'Main Menu';
        $menu_exists = wp_get_nav_menu_object($menu_name);
        
        if (!$menu_exists) {
            $menu_id = wp_create_nav_menu($menu_name);
        } else {
            $menu_id = $menu_exists->term_id;
        }
        
        $locations = get_theme_mod('nav_menu_locations');
        if (!is_array($locations)) $locations = [];
        $locations['primary'] = $menu_id;
        set_theme_mod('nav_menu_locations', $locations);
    }
});

// LCP OPTIMIZATION: Responsive Preload (vNUCLEAR v3.5 - Home & Single support)
add_action('wp_head', function() {
    $thumb_ids = [];
    
    if (is_single() && has_post_thumbnail()) {
        $thumb_ids[] = get_post_thumbnail_id();
    } elseif (is_home() || is_archive() || is_search()) {
        // На главной и архивах прелоадим первые 2 поста для мгновенного LCP
        global $wp_query;
        if (!empty($wp_query->posts)) {
            for ($i = 0; $i < min(2, count($wp_query->posts)); $i++) {
                if (has_post_thumbnail($wp_query->posts[$i]->ID)) {
                    $thumb_ids[] = get_post_thumbnail_id($wp_query->posts[$i]->ID);
                }
            }
        }
    }

    if (empty($thumb_ids)) return;

    $upload_dir = wp_get_upload_dir();
    $base_url = $upload_dir['baseurl'];
    $base_path = $upload_dir['basedir'];

    foreach ($thumb_ids as $thumb_id) {
        $srcset = wp_get_attachment_image_srcset($thumb_id, 'full');
        $sizes = wp_get_attachment_image_sizes($thumb_id, 'full');
        
        if ($srcset) {
            $sources = explode(',', $srcset);
            $new_sources = [];
            foreach ($sources as $source) {
                if (empty($source)) continue;
                $parts = preg_split('/\s+/', trim($source));
                if (count($parts) >= 1) {
                    $url = $parts[0];
                    $Descriptor = isset($parts[1]) ? ' ' . $parts[1] : '';
                    if (preg_match('/\.(jpg|jpeg|png)(\?.*)?$/i', $url)) {
                        $webp_candidate = preg_replace('/\.(jpg|jpeg|png)/i', '.webp', $url);
                        $path_check = str_replace($base_url, $base_path, strtok($webp_candidate, '?'));
                        if (file_exists($path_check)) {
                            $new_sources[] = $webp_candidate . $Descriptor;
                        } else {
                            $new_sources[] = $source;
                        }
                    } else {
                        $new_sources[] = $source;
                    }
                }
            }
            if (!empty($new_sources)) {
                $final_srcset = implode(', ', $new_sources);
                echo '<link rel="preload" as="image" imagesrcset="' . esc_attr($final_srcset) . '" imagesizes="' . esc_attr($sizes) . '" fetchpriority="high" />' . "\n";
            }
        } else {
             $img_url = wp_get_attachment_url($thumb_id);
             $webp_url = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $img_url);
             $path_cand = str_replace($base_url, $base_path, $webp_url);
             if (file_exists($path_cand)) {
                 echo '<link rel="preload" as="image" href="' . esc_url($webp_url) . '" fetchpriority="high" />' . "\n";
             } else {
                 echo '<link rel="preload" as="image" href="' . esc_url($img_url) . '" fetchpriority="high" />' . "\n";
             }
        }
    }
}, 1);

// ГАРМОНИЯ СЕТКИ: Делаем количество постов кратным 3 (12 постов на странице)
add_action('pre_get_posts', function ($query) {
    if (!is_admin() && $query->is_main_query()) {
        $query->set('posts_per_page', 12);
    }
});

// УДАЛЕНИЕ EMOJIS И ЛИШНЕГО МУСОРА WP
add_action('init', function() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    
    // Отключаем Global Styles и SVG Filters (сильно раздувают head)
    remove_action('wp_enqueue_scripts', 'wp_enqueue_global_styles');
    remove_action('wp_body_open', 'wp_global_styles_render_svg_filters');
    
    add_filter('tiny_mce_plugins', function($plugins) {
        if (is_array($plugins)) { return array_diff($plugins, ['wpemoji']); }
        return [];
    });
}, 1);

// Отключение Classic Theme Styles
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('classic-theme-styles');
}, 20);

// БЕЗОПАСНЫЕ ЗАГОЛОВКИ (Удалено send_headers т.к. блокировало Кастомайзер)

// КРИТИЧЕСКИЙ CSS: Встраиваем inline для мгновенной отрисовки
add_action('wp_head', function() {
    $critical_css_file = get_template_directory() . '/critical-wp.css';
    if (file_exists($critical_css_file)) {
        $critical_css = file_get_contents($critical_css_file);
        echo '<style id="critical-css">' . $critical_css . '</style>';
    }
}, 2);

// НЕКРИТИЧЕСКИЙ CSS: Загружаем асинхронно
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('comandos-blog-style', get_stylesheet_uri(), [], '72.0');
    wp_enqueue_style('comandos-custom-styles', get_template_directory_uri() . '/comandos-wp.css', [], '72.0');
});

/**
 * Функция для получения похожих статей по категориям
 */
function comandos_get_related_posts($post_id, $count = 3) {
    $categories = wp_get_post_categories($post_id);
    
    // Если есть категории, ищем похожие посты
    if (!empty($categories)) {
        $related = get_posts([
            'category__in'   => $categories,
            'post__not_in'   => [$post_id],
            'posts_per_page' => $count,
            'orderby'        => 'rand'
        ]);
        
        if (!empty($related)) {
            return $related;
        }
    }
    
    // Если категорий нет или не нашли похожих, возвращаем просто последние посты
    return get_posts([
        'post__not_in'   => [$post_id],
        'posts_per_page' => $count,
        'orderby'        => 'date'
    ]);
}

// ASYNC LOADING: Для всех некритичных стилей
add_filter('style_loader_tag', function($html, $handle, $href) {
    if (is_admin()) return $html;
    
    // Список стилей, которые мы хотим загружать асинхронно
    $async_libs = [
        'comandos-custom-styles',
        'comandos-blog-style',
        'wp-block-library',
        'wp-block-library-theme',
        'global-styles'
    ];

    if (in_array($handle, $async_libs) || strpos($handle, 'google-fonts') !== false) {
        $html = str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\"this.onload=null;this.rel='stylesheet'\"", $html);
        $html = str_replace('rel="stylesheet"', 'rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"', $html);
        $html .= '<noscript><link rel="stylesheet" href="' . esc_url($href) . '"></noscript>';
    }
    return $html;
}, 10, 3);

// ОПТИМИЗИРОВАННЫЕ ШРИФТЫ (Только нужные веса)
function comandos_get_google_fonts_url() {
    return "https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=Unbounded:wght@900&display=optional";
}

add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('comandos-google-fonts', comandos_get_google_fonts_url(), [], null);
});

add_action('wp_head', function() {
    // 1. Preconnects
    echo '<link rel="preconnect" href="https://fonts.googleapis.com">' . "\n";
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
    
    // 2. Preloads (Критические шрифты для FCP)
    // Мы берем прямые ссылки на WOFF2 из Google Fonts для реального предзагрузки
    // Но так как ссылки динамические, используем preload для самого CSS файла или осторожно
    // В данном случае лучше сделать preload основных весов Google Fonts
    echo '<link rel="preload" href="' . comandos_get_google_fonts_url() . '" as="style">' . "\n";
}, 0);



// ОТКЛЮЧАЕМ LAZY LOAD ДЛЯ ПЕРВЫХ КАРТИНОК (LCP Fix)
add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    if (is_admin()) return $attr;
    
    static $counter = 0;
    $counter++;
    
    // Первые 4 картинки (лого + герой + первые 2 в контенте) 
    // должны грузиться мгновенно для высокого LCP и стабильного CLS
    if ($counter <= 4 || (is_single() && strpos($attr['class'] ?? '', 'single-thumb') !== false)) {
        $attr['loading'] = 'eager';
        $attr['fetchpriority'] = 'high';
        $attr['decoding'] = 'async';
    }
    
    return $attr;
}, 10, 3);

// Отключаем lazy-loading для первого изображения в the_content
add_filter('wp_img_tag_add_loading_attr', function($value, $image, $context) {
    if (is_admin() || !is_single()) return $value;
    
    static $content_img_counter = 0;
    if ($context === 'the_content') {
        $content_img_counter++;
        if ($content_img_counter <= 1) { // Самое первое изображение в тексте
            return false; // Отключает атрибут loading
        }
    }
    return $value;
}, 10, 3);

// ПРИНУДИТЕЛЬНЫЙ WEBP ДЛЯ ЛОГОТИПА
add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    if (is_admin()) return $attr;
    
    // Если это логотип
    if (strpos($attr['class'] ?? '', 'custom-logo') !== false || strpos($attr['class'] ?? '', 'header-custom-logo') !== false) {
        $attr['src'] = str_ireplace('.png', '.webp', $attr['src']);
        if (isset($attr['srcset'])) {
            $attr['srcset'] = str_ireplace('.png', '.webp', $attr['srcset']);
        }
    }
    return $attr;
}, 11, 3);

// ФИКС CLS ДЛЯ АВАТАРОВ: Добавляем width и height
add_filter('get_avatar', function($avatar, $id_or_email, $size, $default, $alt, $args) {
    if (strpos($avatar, 'width=') === false) {
        $avatar = str_replace('<img ', '<img width="80" height="80" decoding="async" loading="lazy" class="avatar avatar-80" ', $avatar);
    }
    // Добавляем alt если он пустой
    if (strpos($avatar, 'alt=""') !== false || strpos($avatar, 'alt=\'\'') !== false) {
        $avatar = str_replace(['alt=""', "alt=''"], 'alt="Артем Лахтин"', $avatar);
    }
    return $avatar;
}, 10, 6);

add_action('after_setup_theme', function () {
    add_editor_style('comandos-wp.css');
});

/**
 * РЕГИСТРАЦИЯ SEO METADATA ДЛЯ REST API
 * Позволяет внешним инструментам (n8n) сохранять данные Yoast SEO через API
 */
add_action('init', function() {
    $meta_fields = [
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        '_yoast_wpseo_focuskw'
    ];

    foreach ($meta_fields as $field) {
        register_meta('post', $field, [
            'show_in_rest' => true,
            'single'       => true,
            'type'         => 'string',
        ]);
    }
});


// РАЗРЕШЕНИЕ WEBP: Добавляем поддержку WebP
add_filter('upload_mimes', function($mimes) {
    $mimes['webp'] = 'image/webp';
    return $mimes;
});

/**
 * АВТО-ГЕНЕРАЦИЯ WEBP ПРИ ЗАГРУЗКЕ
 * Создает .webp копию для оригинала и всех уменьшенных размеров (thumbnails)
 */
add_filter('wp_generate_attachment_metadata', function($metadata, $attachment_id) {
    $file = get_attached_file($attachment_id);
    if (!file_exists($file)) return $metadata;

    $info = pathinfo($file);
    $dirname = $info['dirname'];
    $extensions = ['jpg', 'jpeg', 'png'];

    if (in_array(strtolower($info['extension']), $extensions)) {
        // 1. Создаем WebP для оригинала
        $webp_file = $dirname . '/' . $info['filename'] . '.webp';
        $editor = wp_get_image_editor($file);
        if (!is_wp_error($editor)) {
            $editor->save($webp_file, 'image/webp');
        }

        // 2. Создаем WebP для всех нарезанных размеров
        if (!empty($metadata['sizes'])) {
            foreach ($metadata['sizes'] as $size_info) {
                $size_file = $dirname . '/' . $size_info['file'];
                if (file_exists($size_file)) {
                    $size_path = pathinfo($size_file);
                    $size_webp = $dirname . '/' . $size_path['filename'] . '.webp';
                    
                    $size_editor = wp_get_image_editor($size_file);
                    if (!is_wp_error($size_editor)) {
                        $size_editor->save($size_webp, 'image/webp');
                    }
                }
            }
        }
    }
    return $metadata;
}, 10, 2);

/**
 * УНИВЕРСАЛЬНАЯ ПОДМЕНА JPEG/PNG НА WEBP В HTML
 * Автоматически находит изображения и заменяет их на .webp версии, если они существуют на диске
 */
function comandos_apply_webp_replacement($html) {
    if (is_admin()) return $html;

    return preg_replace_callback('/<img([^>]+)>/i', function($matches) {
        $img = $matches[0];
        
        // 1. ОПРЕДЕЛЯЕМ ПУТИ
        $uploads_dir = wp_get_upload_dir();
        $base_url = $uploads_dir['baseurl'];
        $base_path = $uploads_dir['basedir'];
        
        // 2. ОБРАБОТКА SRC
        if (preg_match('/src="([^"]+)\.(jpg|jpeg|png)(\?.*)?"/i', $img, $src_matches)) {
            $src_full = $src_matches[0]; // src="..."
            $url_old = $src_matches[1] . '.' . $src_matches[2] . ($src_matches[3] ?? '');
            $url_webp = $src_matches[1] . '.webp' . ($src_matches[3] ?? '');
            
            // Проверка файла (без query params)
            $url_check = $src_matches[1] . '.webp';
            $path_webp = str_replace($base_url, $base_path, $url_check);
            
            // ПРИМЕЧАНИЕ: Мы предполагаем стандартную структуру папок. Если используется CDN или хитрые пути, проверка может не сработать.
            if (file_exists($path_webp)) {
                $img = str_replace($url_old, $url_webp, $img);
            }
        }
        
        // 3. ОБРАБОТКА SRCSET (ГЛАВНОЕ ИСПРАВЛЕНИЕ ОШИБКИ 404)
        if (preg_match('/srcset="([^"]+)"/i', $img, $srcset_matches)) {
            $old_srcset = $srcset_matches[1];
            $sources = explode(',', $old_srcset);
            $new_sources = [];
            $changed = false;
            
            foreach ($sources as $source) {
                $source = trim($source);
                if (empty($source)) continue;
                
                // Разбор строки: ссылка + ширина (w)
                $parts = preg_split('/\s+/', $source);
                if (count($parts) >= 1) {
                    $url = $parts[0];
                    $Descriptor = isset($parts[1]) ? ' ' . $parts[1] : '';
                    
                    // Попытка найти WebP для конкретного размера (поддержка query params)
                    if (preg_match('/\.(jpg|jpeg|png)(\?.*)?$/i', $url)) {
                        $webp_candidate = preg_replace('/\.(jpg|jpeg|png)/i', '.webp', $url);
                        $webp_path_url = strtok($webp_candidate, '?'); // URL без параметров
                        $webp_path_cand = str_replace($base_url, $base_path, $webp_path_url);
                        
                        // ПРОВЕРКА: Если WebP файл существует физически - берем его. 
                        // Иначе - оставляем оригинальный JPG, чтобы избежать ошибки 404.
                        if (file_exists($webp_path_cand)) {
                            $new_sources[] = $webp_candidate . $Descriptor;
                            $changed = true;
                        } else {
                            $new_sources[] = $source; // Оставляем оригинал
                        }
                    } else {
                         $new_sources[] = $source; // Не картинка или уже webp
                    }
                }
            }
            
            if ($changed) {
                $new_srcset = implode(', ', $new_sources);
                $img = str_replace($old_srcset, $new_srcset, $img);
            }
        }

        // 4. Добавление оптимизаций (Lazy + Async) если их нет
        if (strpos($img, 'loading=') === false) {
            $img = str_replace('<img ', '<img loading="lazy" ', $img);
        }
        if (strpos($img, 'decoding=') === false) {
            $img = str_replace('<img ', '<img decoding="async" ', $img);
        }

        return $img;
    }, $html);
}

// Применяем фильтр ко всем возможным выходам изображений
add_filter('the_content', 'comandos_apply_webp_replacement', 999);
add_filter('post_thumbnail_html', 'comandos_apply_webp_replacement', 999);
add_filter('get_header_image_tag', 'comandos_apply_webp_replacement', 999);

// ОПТИМИЗАЦИЯ КОНТЕНТА: Очистка и защита
add_filter('the_content', function ($content) {
    // 1. Исправление иерархии заголовков в карточке автора (H4 -> H3)
    $content = preg_replace('/<h4([^>]*)>Автор:/i', '<h3$1>Автор:', $content);
    $content = str_replace('</h4>', '</h3>', $content);

    // 2. Авто-определение карточки автора: добавляем обертку и класс avatar
    $content = preg_replace_callback(
        '/(<img[^>]*src="[^"]*gravatar\.com[^>]*>)/i', 
        function($m) {
            $img = $m[1];
            // Гарантируем наличие класса avatar и alt
            if (strpos($img, 'class=') === false) {
                $img = str_replace('<img ', '<img class="avatar" ', $img);
            } elseif (strpos($img, 'class="') !== false && strpos($img, 'avatar') === false) {
                $img = str_replace('class="', 'class="avatar ', $img);
            }
            if (strpos($img, 'alt=') === false || strpos($img, 'alt=""') !== false) {
                $img = str_replace('<img ', '<img alt="Артем Лахтин - AI эксперт" ', $img);
            }
            return '<span class="author-avatar-wrapper">' . $img . '</span>';
        },
        $content
    );

    return $content;
}, 998);

/**
 * НАСТРОЙКИ COMANDOS В КАЗТОМАЙЗЕРЕ
 */
add_action('customize_register', function ($wp_customize) {
    $wp_customize->add_section('comandos_design', [
        'title'    => 'Настройки дизайна Comandos',
        'priority' => 30,
    ]);

    $wp_customize->add_setting('brand_color', ['default' => '#c7f560', 'transport' => 'refresh']);
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'brand_color', [
        'label' => 'Цвет бренда', 'section' => 'comandos_design',
    ]));

    $wp_customize->add_setting('bg_color', ['default' => '#ffffff', 'transport' => 'refresh']);
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'bg_color', [
        'label' => 'Цвет фона', 'section' => 'comandos_design',
    ]));

    // ЗАГОЛОВОК И ОПИСАНИЕ БЛОГА
    $wp_customize->add_setting('blog_title', ['default' => 'Блог Comandos', 'transport' => 'refresh']);
    $wp_customize->add_control('blog_title', [
        'label' => 'Заголовок блога', 'section' => 'comandos_design', 'type' => 'text',
    ]);

    $wp_customize->add_setting('blog_description', ['default' => 'Полезные статьи об ИИ, автоматизации и бизнесе на маркетплейсах.', 'transport' => 'refresh']);
    $wp_customize->add_control('blog_description', [
        'label' => 'Описание блога', 'section' => 'comandos_design', 'type' => 'textarea',
    ]);

    // СООТНОШЕНИЕ СТОРОН ИЗОБРАЖЕНИЙ
    $wp_customize->add_setting('global_img_aspect_ratio', ['default' => 'none', 'transport' => 'refresh']);
    $wp_customize->add_control('global_img_aspect_ratio', [
        'label'   => 'Пропорции изображений',
        'section' => 'comandos_design',
        'type'    => 'select',
        'choices' => [
            'none'   => 'Оригинал (без обрезки)',
            '3 / 2'  => '3:2 (Горизонтальный)',
            '4 / 3'  => '4:3 (Классика)',
            '1 / 1'  => '1:1 (Квадрат)',
            '16 / 9' => '16:9 (Кино)',
        ],
    ]);
});

/**
 * ИНЪЕКЦИЯ ДИНАМИЧЕСКИХ ПЕРЕМЕННЫХ
 */
add_action('wp_head', function () {
    $brand_color = get_theme_mod('brand_color', '#c7f560');
    $bg_color    = get_theme_mod('bg_color', '#ffffff');
    $aspect_ratio = get_theme_mod('global_img_aspect_ratio', 'none');
    $css_aspect_ratio = ($aspect_ratio === 'none') ? 'auto' : $aspect_ratio;
    ?>
    <style id="comandos-dynamic-css">
        :root {
            --primary: <?php echo esc_attr($brand_color); ?>;
            --white: <?php echo esc_attr($bg_color); ?>;
            --img-aspect-ratio: <?php echo esc_attr($css_aspect_ratio); ?>;
            --slate-100: #f1f5f9;
            --slate-900: #111111;
            --slate-800: #333333;
            --header-bg: rgba(255, 255, 255, 0.9);
            --header-border: rgba(0, 0, 0, 0.1);
            --header-text: #111111;
            
            /* Полупрозрачные версии брендового цвета для подсветки */
            --primary-glow-light: color-mix(in srgb, var(--primary) 20%, transparent);
            --primary-glow-medium: color-mix(in srgb, var(--primary) 30%, transparent);
            --primary-glow-strong: color-mix(in srgb, var(--primary) 40%, transparent);
        }
        body { background-color: var(--white) !important; }
    </style>
    <?php
}, 999);

// ИНЪЕКЦИЯ ASPECT-RATIO (FIX CLS для 'Original' и Custom)
add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    // 1. Проверяем настройку темы
    $ratio_setting = get_theme_mod('global_img_aspect_ratio', 'none');
    
    // 2. Логика определения пропорций
    $style_ratio = '';
    
    if ($ratio_setting === 'none' || $ratio_setting === '') {
        // Если "Original" - берем реальные размеры из метаданных
        $meta = wp_get_attachment_metadata($attachment->ID);
        if (!empty($meta['width']) && !empty($meta['height'])) {
            $w = $meta['width'];
            $h = $meta['height'];
            $style_ratio = "$w / $h";
        }
    } else {
        // Если задана фиксированная пропорция (16 / 9, 4 / 3 и т.д.) - используем её
        $style_ratio = $ratio_setting;
    }

    // 3. Инъекция стиля
    if (!empty($style_ratio)) {
        $style = "aspect-ratio: $style_ratio;";
        
        if (isset($attr['style'])) {
            $attr['style'] .= ' ' . $style;
        } else {
            $attr['style'] = $style;
        }
    }
    
    return $attr;
}, 20, 3);

// ОТКЛЮЧЕНИЕ ПРИНУДИТЕЛЬНОЙ ОБРЕЗКИ (Чтобы сохранить 2:3, 3:2 и т.д.)
add_filter('intermediate_image_sizes_advanced', function($sizes) {
    if (isset($sizes['medium'])) $sizes['medium']['crop'] = false;
    if (isset($sizes['large'])) $sizes['large']['crop'] = false;
    return $sizes;
});

// Глобальная настройка соотношения сторон для превью
add_action('after_setup_theme', function() {
    update_option('medium_crop', 0);
    update_option('large_crop', 0);
}, 20);

/**
 * ЧИСТЫЕ ЗАГОЛОВОКИ АРХИВОВ
 * Убирает "Рубрика:", "Архивы:" и т.д.
 */
add_filter('get_the_archive_title', function ($title) {
    if (is_category()) {
        $title = single_cat_title('', false);
    } elseif (is_tag()) {
        $title = single_tag_title('', false);
    } elseif (is_author()) {
        $title = get_the_author();
    } elseif (is_post_type_archive()) {
        $title = post_type_archive_title('', false);
    } elseif (is_tax()) {
        $title = single_term_title('', false);
    }
    return wp_strip_all_tags($title);
});

/**
 * ПОДСКАЗКА ДЛЯ SEO В КОНСОЛИ
 * Добавляет пояснение к полю "Краткое описание" в настройках сайта.
 */
add_action('customize_register', function ($wp_customize) {
    $wp_customize->get_control('blogdescription')->description = 'Этот текст не виден на сайте, но ОЧЕНЬ важен для Google и Яндекса. Он попадает в мета-теги и заголовок вкладки браузера.';
});
