<?php
/**
 * Comandos Blog functions and definitions
 *
 * @package Comandos_Blog
 */

declare(strict_types=1);

/**
 * 📂 THEME DECOMPOSITION (v11.0 Gold Standard)
 * Logic is separated into specific files in the inc/ directory for better maintainability.
 */

// 1. Theme Setup (Supports, Menus, Image Sizes)
require get_template_directory() . '/inc/setup.php';

// 2. Optimization (WebP, Emoji removal, LCP fixes)
require get_template_directory() . '/inc/optimization.php';

// 3. Performance (Preloads, LCP, Analytics)
require get_template_directory() . '/inc/performance.php';

// 4. Infrastructure (Scripts, Styles, Helpers)
require get_template_directory() . '/inc/enqueue.php';

// 5. Critical CSS (Unified Critical & Dynamic Variables)
require get_template_directory() . '/inc/critical-css.php';

// 6. Customizer (Settings and Dynamic Style Injection)
require get_template_directory() . '/inc/customizer.php';

/**
 * REST API: SEO Metadata support
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

/**
 * Archive Title Cleaner
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
 * Оптимизация атрибута sizes (CLS & Performance)
 */
add_filter('wp_calculate_image_sizes', function($sizes, $size) {
    $width = $size[0];
    if ($width >= 300) {
        return '(max-width: 480px) 95vw, (max-width: 768px) 90vw, (max-width: 1200px) 700px, 1024px';
    }
    return $sizes;
}, 10, 2);
