<?php
/**
 * Assets Enqueue and Helper Functions
 *
 * @package Comandos_Blog
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue non-critical styles.
 */
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('comandos-blog-style', get_stylesheet_uri(), [], '103.0');
    wp_enqueue_style('comandos-custom-styles', get_template_directory_uri() . '/comandos-wp.css', [], '141.0');
});

/**
 * Async load CSS handles (v100.0 - Consolidated)
 */
add_filter('style_loader_tag', function($html, $handle, $href) {
    if (is_admin()) {
        return $html;
    }
    
    // List of handles to SKIP async loading (avoid FOUC for critical bits)
    $exclude_handles = ['comandos-ultimate'];

    if (in_array($handle, $exclude_handles)) {
        return $html;
    }

    // Consolidated async loading pattern
    return "<link rel='stylesheet' id='{$handle}-css' href='{$href}' media='print' onload=\"this.media='all'; this.onload=null;\">";
}, 10, 3);

/**
 * Defer all JS (v105.0)
 */
add_filter('script_loader_tag', function ($tag, $handle) {
    if (is_admin()) {
        return $tag;
    }
    // Defer everything
    return str_replace(' src', ' defer src', $tag);
}, 10, 2);

/**
 * Current article language saved by CyberSEO.
 */
function comandos_post_language(int $post_id = 0): string {
    $post_id = $post_id > 0 ? $post_id : get_the_ID();
    $language = strtolower(trim((string) get_post_meta($post_id, 'cyberseo_language', true)));
    $language = preg_replace('/[^a-z_-]/', '', $language);
    if (strpos($language, '-') !== false) {
        $language = explode('-', $language, 2)[0];
    }
    if (strpos($language, '_') !== false) {
        $language = explode('_', $language, 2)[0];
    }

    return $language !== '' ? $language : 'ru';
}

/**
 * Theme labels by article language.
 */
function comandos_label(string $key, int $post_id = 0): string {
    $labels = [
        'ru' => [
            'related' => 'Читайте также',
            'back' => 'Назад к списку',
            'not_found' => 'Запись не найдена.',
        ],
        'de' => [
            'related' => 'Lesen Sie auch',
            'back' => 'Zurück zur Liste',
            'not_found' => 'Beitrag nicht gefunden.',
        ],
        'en' => [
            'related' => 'Read also',
            'back' => 'Back to list',
            'not_found' => 'Post not found.',
        ],
        'fr' => [
            'related' => 'À lire aussi',
            'back' => 'Retour à la liste',
            'not_found' => 'Article introuvable.',
        ],
        'es' => [
            'related' => 'También puedes leer',
            'back' => 'Volver a la lista',
            'not_found' => 'Entrada no encontrada.',
        ],
        'it' => [
            'related' => 'Leggi anche',
            'back' => 'Torna all’elenco',
            'not_found' => 'Articolo non trovato.',
        ],
        'pt' => [
            'related' => 'Leia também',
            'back' => 'Voltar à lista',
            'not_found' => 'Artigo não encontrado.',
        ],
        'pl' => [
            'related' => 'Przeczytaj także',
            'back' => 'Wróć do listy',
            'not_found' => 'Nie znaleziono wpisu.',
        ],
        'tr' => [
            'related' => 'Ayrıca okuyun',
            'back' => 'Listeye dön',
            'not_found' => 'Yazı bulunamadı.',
        ],
        'nl' => [
            'related' => 'Lees ook',
            'back' => 'Terug naar de lijst',
            'not_found' => 'Bericht niet gevonden.',
        ],
    ];

    $language = comandos_post_language($post_id);
    if (isset($labels[$language][$key])) {
        return $labels[$language][$key];
    }
    return $language === 'ru' ? ($labels['ru'][$key] ?? $key) : ($labels['en'][$key] ?? $key);
}

/**
 * Article date formatted by article language, not by global WordPress locale.
 */
function comandos_post_date_label(int $post_id = 0): string {
    $post_id = $post_id > 0 ? $post_id : get_the_ID();
    $language = comandos_post_language($post_id);
    $timestamp = get_post_time('U', true, $post_id);
    if (!$timestamp) {
        return get_the_date('', $post_id);
    }

    if ($language === 'ru') {
        return get_the_date('', $post_id);
    }

    $months = [
        'en' => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'fr' => ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        'de' => ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        'es' => ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        'it' => ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
        'pt' => ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
        'pl' => ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'],
        'tr' => ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
        'nl' => ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    ];

    $monthIndex = (int) gmdate('n', $timestamp) - 1;
    $monthNames = $months[$language] ?? $months['en'];
    return sprintf('%d %s %s', (int) gmdate('j', $timestamp), $monthNames[$monthIndex] ?? gmdate('F', $timestamp), gmdate('Y', $timestamp));
}

/**
 * Get related posts by categories.
 *
 * @param int $post_id Current post ID.
 * @param int $count Number of posts to retrieve.
 * @return WP_Post[] Array of post objects.
 */
/**
 * Get related posts by categories with caching.
 *
 * @param int $post_id Current post ID.
 * @param int $count Number of posts to retrieve.
 * @return WP_Post[] Array of post objects.
 */
function comandos_get_related_posts(int $post_id, int $count = 3): array {
    $language = comandos_post_language($post_id);
    $transient_key = 'comandos_related_' . $post_id . '_' . $count . '_' . $language;
    $related_ids = get_transient($transient_key);

    if (false === $related_ids) {
        $categories = wp_get_post_categories($post_id);
        
        $args = [
            'post__not_in'   => [$post_id],
            'posts_per_page' => $count,
            'fields'         => 'ids', // Only get IDs for the transient
            'no_found_rows'  => true,   // Optimization: don't count total rows
            'meta_query'     => [
                [
                    'key'     => 'cyberseo_language',
                    'value'   => $language,
                    'compare' => '=',
                ],
            ],
        ];

        if (!empty($categories)) {
            $args['category__in'] = $categories;
        }

        $related_ids = get_posts($args);
        
        // Cache for 12 hours
        set_transient($transient_key, $related_ids, 12 * HOUR_IN_SECONDS);
    }

    if (empty($related_ids)) {
        return [];
    }

    // Convert IDs back to post objects (this is fast if they are in the object cache)
    return get_posts([
        'post__in'            => $related_ids,
        'posts_per_page'      => $count,
        'post_type'           => 'post',
        'ignore_sticky_posts' => true,
    ]);
}
