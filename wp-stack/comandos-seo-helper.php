<?php
/**
 * Plugin Name: Comandos SEO Helper
 * Description: Открывает поля Yoast SEO и Twitter Cards для записи через REST API n8n.
 * Version: 1.3.0
 * Author: Comandos AI
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Регистрация мета-полей для REST API
 */
function comandos_register_seo_meta()
{
    $post_types = ['post', 'page'];
    $meta_keys = [
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        '_yoast_wpseo_focuskw',
        'twitter:label1',
        'twitter:data1',
        'twitter:label2',
        'twitter:data2',
        'reading_time',
    ];

    foreach ($post_types as $post_type) {
        foreach ($meta_keys as $key) {
            register_post_meta($post_type, $key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => 'string',
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                }
            ]);
        }
    }
}
add_action('init', 'comandos_register_seo_meta');

/**
 * 1. ПРИНУДИТЕЛЬНОЕ СОХРАНЕНИЕ И СБРОС КЕША YOAST
 */
add_action('rest_after_insert_post', 'comandos_api_save_meta_v13', 10, 2);
add_action('rest_after_insert_page', 'comandos_api_save_meta_v13', 10, 2);

function comandos_api_save_meta_v13(\WP_Post $post, \WP_REST_Request $request)
{
    $meta = $request->get_param('meta');
    if (!empty($meta) && is_array($meta)) {
        foreach ($meta as $key => $value) {
            update_post_meta($post->ID, $key, $value);
        }

        // Сбрасываем кеш Yoast SEO (Indexables), чтобы он увидел новые 16 минут
        if (class_exists('Yoast_Indexable_Repository') || function_exists('YoastSEO')) {
            try {
                // Если есть WP-CLI или прямой доступ к репозиторию
                if (function_exists('YoastSEO')) {
                    $indexable_factory = YoastSEO()->classes->get(\Yoast\WP\SEO\Repositories\Indexable_Repository::class);
                    $indexable = $indexable_factory->find_by_id_and_type($post->ID, 'post');
                    if ($indexable) {
                        $indexable->delete();
                    }
                }
            } catch (\Exception $e) {
                // Молча игнорируем
            }
        }
    }
}

/**
 * 2. ПЕРЕХВАТ ВЫВОДА (ПРИОРИТЕТ 999)
 */
function comandos_get_meta_v13($key, $default = '')
{
    $id = is_singular() ? get_the_ID() : get_queried_object_id();
    if (!$id)
        return $default;
    $val = get_post_meta($id, $key, true);
    return (!empty($val)) ? $val : $default;
}

// Позволяем Yoast выводить данные, но подменяем их на наши
add_filter('wpseo_enhanced_slack_data_enabled', '__return_true', 999);

add_filter('wpseo_metadesc', function ($desc) {
    return comandos_get_meta_v13('_yoast_wpseo_metadesc', $desc); }, 999);
add_filter('wpseo_twitter_label1', function () {
    return comandos_get_meta_v13('twitter:label1', ''); }, 999);
add_filter('wpseo_twitter_data1', function ($d) {
    return comandos_get_meta_v13('twitter:data1', $d); }, 999);
add_filter('wpseo_twitter_label2', function () {
    return comandos_get_meta_v13('twitter:label2', ''); }, 999);
add_filter('wpseo_twitter_data2', function ($d) {
    return comandos_get_meta_v13('twitter:data2', $d); }, 999);

/**
 * 3. ОТЛАДКА В HTML
 */
add_action('wp_head', function () {
    if (is_singular()) {
        $val = get_post_meta(get_the_ID(), 'twitter:data1', true);
        echo "\n<!-- Comandos SEO Debug: Data1 = '{$val}' -->\n";
    }
}, 1);

/**
 * ПИНГ
 */
add_action('rest_api_init', function () {
    register_rest_route('comandos/v1', '/ping', [
        'methods' => 'GET',
        'callback' => function () {
            return new \WP_REST_Response(['status' => 'ok', 'version' => '1.3.0'], 200);
        },
        'permission_callback' => '__return_true'
    ]);
});
