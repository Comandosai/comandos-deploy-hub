<?php
/**
 * Optimization and Performance Fixes
 *
 * @package Comandos_Blog
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Remove Emojis and WordPress bloat from wp_head.
 */
add_action('init', function() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
    
    // Disable Global Styles and SVG Filters
    remove_action('wp_enqueue_scripts', 'wp_enqueue_global_styles');
    remove_action('wp_body_open', 'wp_global_styles_render_svg_filters');
    
    add_filter('tiny_mce_plugins', function($plugins) {
        if (is_array($plugins)) { return array_diff($plugins, ['wpemoji']); }
        return [];
    });
}, 1);

/**
 * Disable Classic Theme Styles, WP Embed and Jquery Migrate.
 */
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('classic-theme-styles');
    wp_deregister_script('wp-embed');
    
    // Disable jquery-migrate to reduce JS weight and reflow
    if (!is_admin() && isset($GLOBALS['wp_scripts']->registered['jquery'])) {
        $scripts = $GLOBALS['wp_scripts'];
        $scripts->registered['jquery']->deps = array_diff($scripts->registered['jquery']->deps, ['jquery-migrate']);
    }
}, 20);

/**
 * ASYNC LOADING logic moved to inc/enqueue.php to avoid duplication.
 */

/**
 * LCP FIX: Disable Lazy Load for the first 4 images (Logo, Hero, etc.).
 */
add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    if (is_admin()) return $attr;
    static $counter = 0;
    $counter++;
    if ($counter <= 4 || (is_single() && strpos($attr['class'] ?? '', 'single-thumb') !== false)) {
        $attr['loading'] = 'eager';
        $attr['fetchpriority'] = 'high';
        $attr['decoding'] = 'async';
    }
    return $attr;
}, 10, 3);

/**
 * Disable lazy-loading for the first image in the article content.
 */
add_filter('wp_img_tag_add_loading_attr', function($value, $image, $context) {
    if (is_admin() || !is_single()) return $value;
    static $content_img_counter = 0;
    if ($context === 'the_content') {
        $content_img_counter++;
        if ($content_img_counter <= 1) {
            return false;
        }
    }
    return $value;
}, 10, 3);

/**
 * Force WebP for Logo.
 */
add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    if (is_admin()) return $attr;
    if (strpos($attr['class'] ?? '', 'custom-logo') !== false || strpos($attr['class'] ?? '', 'header-custom-logo') !== false) {
        $attr['src'] = str_ireplace('.png', '.webp', $attr['src']);
        if (isset($attr['srcset'])) {
            $attr['srcset'] = str_ireplace('.png', '.webp', $attr['srcset']);
        }
    }
    return $attr;
}, 11, 3);

/**
 * CLS FIX: Ensure width/height for all avatars and images.
 */
add_filter('get_avatar', function($avatar, $id_or_email, $size, $default, $alt, $args) {
    if (strpos($avatar, 'width=') === false) {
        $avatar = str_replace('<img ', '<img width="80" height="80" decoding="async" loading="lazy" class="avatar avatar-80" ', $avatar);
    }
    if (strpos($avatar, 'alt=""') !== false || strpos($avatar, 'alt=\'\'') !== false) {
        $avatar = str_replace(['alt=""', "alt=''"], 'alt="Артем Лахтин"', $avatar);
    }
    return $avatar;
}, 10, 6);

add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
    if (!isset($attr['width']) || !isset($attr['height'])) {
        $img_data = wp_get_attachment_image_src($attachment->ID, $size);
        if ($img_data) {
            $attr['width'] = $img_data[1];
            $attr['height'] = $img_data[2];
        }
    }
    return $attr;
}, 20, 3);

/**
 * WebP Support and Auto-Generation.
 */
add_filter('upload_mimes', function($mimes) {
    $mimes['webp'] = 'image/webp';
    return $mimes;
});

add_filter('wp_generate_attachment_metadata', function($metadata, $attachment_id) {
    $file = get_attached_file($attachment_id);
    if (!file_exists($file)) return $metadata;
    $info = pathinfo($file);
    $dirname = $info['dirname'];
    $extensions = ['jpg', 'jpeg', 'png'];
    if (in_array(strtolower($info['extension']), $extensions)) {
        $webp_file = $dirname . '/' . $info['filename'] . '.webp';
        $editor = wp_get_image_editor($file);
        if (!is_wp_error($editor)) { $editor->save($webp_file, 'image/webp'); }
        if (!empty($metadata['sizes'])) {
            foreach ($metadata['sizes'] as $size_info) {
                $size_file = $dirname . '/' . $size_info['file'];
                if (file_exists($size_file)) {
                    $size_path = pathinfo($size_file);
                    $size_webp = $dirname . '/' . $size_path['filename'] . '.webp';
                    $size_editor = wp_get_image_editor($size_file);
                    if (!is_wp_error($size_editor)) { $size_editor->save($size_webp, 'image/webp'); }
                }
            }
        }
    }
    return $metadata;
}, 10, 2);

/**
 * Replace JPEG/PNG with WebP in HTML.
 */
function comandos_apply_webp_replacement($html) {
    if (is_admin()) return $html;
    return preg_replace_callback('/<img([^>]+)>/i', function($matches) {
        $img = $matches[0];
        $uploads_dir = wp_get_upload_dir();
        $base_url = $uploads_dir['baseurl'];
        $base_path = $uploads_dir['basedir'];
        if (preg_match('/src="([^"]+)\.(jpg|jpeg|png)(\?.*)?"/i', $img, $src_matches)) {
            $url_old = $src_matches[1] . '.' . $src_matches[2] . ($src_matches[3] ?? '');
            $url_webp = $src_matches[1] . '.webp' . ($src_matches[3] ?? '');
            $url_check = $src_matches[1] . '.webp';
            $path_webp = str_replace($base_url, $base_path, $url_check);
            if (file_exists($path_webp)) { $img = str_replace($url_old, $url_webp, $img); }
        }
        if (preg_match('/srcset="([^"]+)"/i', $img, $srcset_matches)) {
            $old_srcset = $srcset_matches[1];
            $sources = explode(',', $old_srcset);
            $new_sources = [];
            $changed = false;
            foreach ($sources as $source) {
                $source = trim($source);
                if (empty($source)) continue;
                $parts = preg_split('/\s+/', $source);
                if (count($parts) >= 1) {
                    $url = $parts[0];
                    $Descriptor = isset($parts[1]) ? ' ' . $parts[1] : '';
                    if (preg_match('/\.(jpg|jpeg|png)(\?.*)?$/i', $url)) {
                        $webp_candidate = preg_replace('/\.(jpg|jpeg|png)/i', '.webp', $url);
                        $webp_path_url = strtok($webp_candidate, '?');
                        $webp_path_cand = str_replace($base_url, $base_path, $webp_path_url);
                        if (file_exists($webp_path_cand)) {
                            $new_sources[] = $webp_candidate . $Descriptor;
                            $changed = true;
                        } else { $new_sources[] = $source; }
                    } else { $new_sources[] = $source; }
                }
            }
            if ($changed) {
                $new_srcset = implode(', ', $new_sources);
                $img = str_replace($old_srcset, $new_srcset, $img);
            }
        }
        if (strpos($img, 'loading=') === false) { $img = str_replace('<img ', '<img loading="lazy" ', $img); }
        if (strpos($img, 'decoding=') === false) { $img = str_replace('<img ', '<img decoding="async" ', $img); }
        return $img;
    }, $html);
}
add_filter('the_content', 'comandos_apply_webp_replacement', 999);
add_filter('post_thumbnail_html', 'comandos_apply_webp_replacement', 999);
add_filter('get_header_image_tag', 'comandos_apply_webp_replacement', 999);

/**
 * CONTENT OPTIMIZATION: Fix header hierarchy and author layout.
 */
add_filter('the_content', function ($content) {
    // Author card title fix (H4 -> H3)
    $content = preg_replace('/<h4([^>]*)>Автор:/i', '<h3$1>Автор:', $content);
    $content = str_replace('</h4>', '</h3>', $content);
    
    // Author avatar wrapper
    $content = preg_replace_callback('/(<img[^>]*src="[^"]*gravatar\.com[^>]*>)/i', function($m) {
        $img = $m[1];
        if (strpos($img, 'class=') === false) { $img = str_replace('<img ', '<img class="avatar" ', $img); }
        elseif (strpos($img, 'class="') !== false && strpos($img, 'avatar') === false) { $img = str_replace('class="', 'class="avatar ', $img); }
        if (strpos($img, 'alt=') === false || strpos($img, 'alt=""') !== false) { $img = str_replace('<img ', '<img alt="Артем Лахтин - AI эксперт" ', $img); }
        return '<span class="author-avatar-wrapper">' . $img . '</span>';
    }, $content);
    return $content;
}, 998);
