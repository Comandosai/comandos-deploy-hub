<?php
/**
 * Performance and Preload Logic
 *
 * @package Comandos_Blog
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Helper to get WebP URL from any image URL.
 */
function comandos_get_webp_url(string $url): string {
    return str_ireplace(['.jpg', '.jpeg', '.png'], '.webp', $url);
}

/**
 * Main performance injection to wp_head.
 */
add_action('wp_head', function() {
    // 1. PRECONNECT & DNS-PREFETCH
    echo '<link rel="preconnect" href="' . esc_url(home_url()) . '" crossorigin>' . "\n";
    echo '<link rel="dns-prefetch" href="' . esc_url(home_url()) . '">' . "\n";

    // 2. LCP PRELOAD
    $lcp_img_id = null;
    if (is_singular() && has_post_thumbnail()) {
        $lcp_img_id = get_post_thumbnail_id();
    } elseif ((is_home() || is_archive()) && have_posts()) {
        $recent_posts = get_posts(['numberposts' => 1, 'fields' => 'ids']);
        if (!empty($recent_posts)) {
            $lcp_img_id = get_post_thumbnail_id($recent_posts[0]);
        }
    }

    if ($lcp_img_id) {
        $img_src = wp_get_attachment_image_url($lcp_img_id, 'full');
        $img_srcset = wp_get_attachment_image_srcset($lcp_img_id, 'full');

        if ($img_src) {
            $img_src_webp = comandos_get_webp_url($img_src);
            echo '<link rel="preload" as="image" href="' . esc_url($img_src_webp) . '" fetchpriority="high"';
            if ($img_srcset) {
                $img_srcset_webp = comandos_get_webp_url($img_srcset);
                echo ' imagesrcset="' . esc_attr($img_srcset_webp) . '"';
            }
            // Smart sizes for LCP
            $manual_sizes = '(max-width: 480px) 100vw, (max-width: 767px) 100vw, 1024px';
            echo ' imagesizes="' . esc_attr($manual_sizes) . '"';
            echo '>' . "\n";
        }
    }

    // 3. LOGO & FONT PRELOAD
    $logo_id = get_theme_mod('custom_logo') ?: get_option('site_logo');
    if ($logo_id) {
        $logo_src = wp_get_attachment_image_url($logo_id, [128, 128]);
        if ($logo_src) {
            echo '<link rel="preload" as="image" href="' . esc_url(comandos_get_webp_url($logo_src)) . '" fetchpriority="high">' . "\n";
        }
    }
}, 1);
