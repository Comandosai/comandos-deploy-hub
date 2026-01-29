<?php

declare(strict_types=1);

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    
    // КАСТОМНЫЕ РАЗМЕРЫ (Для идеальной производительности Lighthouse)
    add_image_size('comandos-thumb', 500, 281, true); // 16:9 для "Читайте также"
    
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
});

// УДАЛЕНИЕ EMOJIS (Убирает лишние JS/CSS запросы)
add_action('init', function() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    add_filter('tiny_mce_plugins', function($plugins) {
        if (is_array($plugins)) { return array_diff($plugins, ['wpemoji']); }
        return [];
    });
    add_filter('wp_resource_hints', function($urls, $relation_type) {
        if ('dns-prefetch' === $relation_type) {
            $emoji_svg_url = apply_filters('emoji_svg_url', 'https://s.w.org/images/core/emoji/14.0.0/svg/');
            $urls = array_diff($urls, [$emoji_svg_url]);
        }
        return $urls;
    }, 10, 2);
});

// КЭШИРОВАНИЕ ЗАГОЛОВКОВ (Для Lighthouse Best Practices)
add_action('send_headers', function() {
    if (!is_admin()) {
        header('Cache-Control: public, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
    }
});

// КРИТИЧЕСКИЙ CSS: Встраиваем inline для мгновенной отрисовки
add_action('wp_head', function() {
    $critical_css = file_get_contents(get_template_directory() . '/critical.css');
    if ($critical_css) {
        echo '<style id="critical-css">' . $critical_css . '</style>';
    }
}, 1);

// НЕКРИТИЧЕСКИЙ CSS: Загружаем асинхронно (не блокируем отрисовку)
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('comandos-blog-style', get_stylesheet_uri(), [], '4.1');
    wp_enqueue_style('comandos-custom-styles', get_template_directory_uri() . '/comandos-wp.css', [], '4.1');
});

/**
 * Функция для получения похожих статей по категориям
 */
function comandos_get_related_posts($post_id, $count = 3) {
    $categories = wp_get_post_categories($post_id);
    if (empty($categories)) return [];

    return get_posts([
        'category__in'   => $categories,
        'post__not_in'   => [$post_id],
        'posts_per_page' => $count,
        'orderby'        => 'rand'
    ]);
}

// ASYNC LOADING: Модифицируем HTML напрямую для асинхронной загрузки
add_filter('style_loader_tag', function($html, $handle, $href) {
    if ($handle === 'comandos-blog-style' || $handle === 'comandos-custom-styles') {
        $html = str_replace("media='all'", "media='print' onload=\"this.media='all'\"", $html);
        $html .= '<noscript><link rel="stylesheet" href="' . esc_url($href) . '"></noscript>';
    }
    return $html;
}, 10, 3);

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
        
        // 1. Обработка основного src
        if (preg_match('/src="([^"]+)\.(jpg|jpeg|png)"/i', $img, $src_matches)) {
            $url_base = $src_matches[1];
            $ext = $src_matches[2];
            $webp_url = $url_base . '.webp';
            
            // Проверка существования файла на диске
            $uploads = wp_get_upload_dir();
            $path = str_replace($uploads['baseurl'], $uploads['basedir'], $webp_url);
            
            if (file_exists($path)) {
                $img = str_replace($url_base . '.' . $ext, $webp_url, $img);
                // 2. Обработка srcset для корректной работы адаптивности
                $img = preg_replace('/\.(jpg|jpeg|png)(?=[ ,"])/i', '.webp', $img);
            }
        }

        // 3. Добавление оптимизаций (Lazy + Async) если их нет
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

// ОПТИМИЗАЦИЯ КОНТЕНТА: Очистка инлайн-стилей и защита ссылок
add_filter('the_content', function ($content) {
    // 1. Удаление инлайн-стилей (style="...")
    $content = preg_replace('/ style=("|\').*?("|\')/i', '', $content);
    
    // 2. Исправление иерархии заголовков в карточке автора (H4 -> H3)
    $content = preg_replace('/<h4([^>]*)>Автор:/i', '<h3$1>Автор:', $content);
    $content = str_replace('</h4>', '</h3>', $content);

    // 3. Авто-определение карточки автора: добавляем обертку для аватара
    $content = preg_replace(
        '/(<img[^>]*src="[^"]*gravatar\.com[^>]*>)/i', 
        '<span class="author-avatar-wrapper">$1</span>', 
        $content
    );

    return $content;
}, 998);
