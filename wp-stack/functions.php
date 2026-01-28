<?php

declare(strict_types=1);

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
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


// РАЗРЕШЕНИЕ WEBP: Добавляем поддержку WebP
add_filter('upload_mimes', function($mimes) {
    $mimes['webp'] = 'image/webp';
    return $mimes;
});

/**
 * АВТО-ГЕНЕРАЦИЯ WEBP ПРИ ЗАГРУЗКЕ
 * Создает .webp копию для каждого загруженного файла
 */
add_filter('wp_generate_attachment_metadata', function($metadata, $attachment_id) {
    $file = get_attached_file($attachment_id);
    if (!file_exists($file)) return $metadata;

    $info = pathinfo($file);
    if (in_array(strtolower($info['extension']), ['jpg', 'jpeg', 'png'])) {
        $webp_file = $info['dirname'] . '/' . $info['filename'] . '.webp';
        
        $editor = wp_get_image_editor($file);
        if (!is_wp_error($editor)) {
            $editor->save($webp_file, 'image/webp');
        }
    }
    return $metadata;
}, 10, 2);

// ОПТИМИЗАЦИЯ КОНТЕНТА: Очистка инлайн-стилей и защита ссылок
add_filter('the_content', function ($content) {
    // 1. Удаление инлайн-стилей (style="...")
    $content = preg_replace('/ style=("|\').*?("|\')/i', '', $content);
    
    // 3. Исправление иерархии заголовков в карточке автора (H4 -> H3)
    $content = preg_replace('/<h4([^>]*)>Автор:/i', '<h3$1>Автор:', $content);
    $content = str_replace('</h4>', '</h3>', $content);

    // 4. Оптимизация изображений: WebP + Lazy + Decoding
    $content = preg_replace_callback('/<img([^>]+)>/i', function($matches) {
        $img = $matches[0];
        
        // Попытка заменить на .webp если файл существует
        if (preg_match('/src="([^"]+)\.(jpg|jpeg|png)"/i', $img, $src_matches)) {
            $url = $src_matches[1] . '.' . $src_matches[2];
            $webp_url = $src_matches[1] . '.webp';
            
            // Проверка существования файла на диске (упрощенно через URL -> Path)
            $path = str_replace(content_url(), WP_CONTENT_DIR, $webp_url);
            if (file_exists($path)) {
                $img = str_replace($url, $webp_url, $img);
                // Также фиксим srcset если он есть
                $img = preg_replace('/\.(jpg|jpeg|png)(?=[ ,"])/i', '.webp', $img);
            }
        }

        if (strpos($img, 'loading=') === false) {
            $img = str_replace('<img ', '<img loading="lazy" ', $img);
        }
        if (strpos($img, 'decoding=') === false) {
            $img = str_replace('<img ', '<img decoding="async" ', $img);
        }
        return $img;
    }, $content);

    // 5. Авто-определение карточки автора: добавляем класс .author-card-avatar к картинке
    $content = preg_replace(
        '/(<img[^>]*src="[^"]*gravatar\.com[^>]*>)/i', 
        '<span class="author-avatar-wrapper">$1</span>', 
        $content
    );

    return $content;
}, 999);
