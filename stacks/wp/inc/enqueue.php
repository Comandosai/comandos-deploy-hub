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
    $post_id = $post_id > 0 ? $post_id : get_queried_object_id();
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

function comandos_language_tag(string $language): string {
    return [
        'ru' => 'ru-RU',
        'de' => 'de-DE',
        'en' => 'en-US',
        'fr' => 'fr-FR',
        'es' => 'es-ES',
        'it' => 'it-IT',
        'pt' => 'pt-PT',
        'pl' => 'pl-PL',
        'tr' => 'tr-TR',
        'nl' => 'nl-NL',
    ][$language] ?? 'en-US';
}

function comandos_language_locale(string $language): string {
    return str_replace('-', '_', comandos_language_tag($language));
}

function comandos_current_language_tag(): string {
    return comandos_language_tag(comandos_post_language());
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

function comandos_cover_alt(int $post_id): string {
    $thumbnail_id = get_post_thumbnail_id($post_id);
    if ($thumbnail_id) {
        $media_alt = trim((string) get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true));
        if ($media_alt !== '') {
            return wp_strip_all_tags($media_alt);
        }
    }

    $title = wp_strip_all_tags(get_the_title($post_id));
    return wp_html_excerpt($title, 90, '...');
}

add_filter('language_attributes', function($output, $doctype) {
    if (!is_singular('post')) {
        return $output;
    }

    return 'lang="' . esc_attr(comandos_current_language_tag()) . '"';
}, 20, 2);

add_filter('locale', function($locale) {
    if (!is_admin() && is_singular('post')) {
        return comandos_language_locale(comandos_post_language());
    }

    return $locale;
}, 20);

add_filter('wpseo_locale', function($locale) {
    if (is_singular('post')) {
        return comandos_language_locale(comandos_post_language());
    }

    return $locale;
}, 20);

function comandos_apply_schema_language(array $data): array {
    if (is_singular('post')) {
        $data['inLanguage'] = comandos_current_language_tag();
    }

    return $data;
}
add_filter('wpseo_schema_article', 'comandos_apply_schema_language', 20);
add_filter('wpseo_schema_webpage', 'comandos_apply_schema_language', 20);
add_filter('wpseo_schema_graph', function(array $graph): array {
    if (!is_singular('post')) {
        return $graph;
    }

    $language_tag = comandos_current_language_tag();
    array_walk_recursive($graph, static function (&$value, $key) use ($language_tag): void {
        if ($key === 'inLanguage') {
            $value = $language_tag;
        }
    });

    return $graph;
}, 20);

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
 * Get related posts by categories with caching.
 *
 * @param int $post_id Current post ID.
 * @param int $count Number of posts to retrieve.
 * @return WP_Post[] Array of post objects.
 */
function comandos_get_related_posts(int $post_id, int $count = 3): array {
    $language = comandos_post_language($post_id);
    $transient_key = 'comandos_related_v2_' . $post_id . '_' . $count . '_' . $language;
    $related_ids = get_transient($transient_key);

    if (false === $related_ids) {
        $categories = wp_get_post_categories($post_id);
        
        $args = [
            'post__not_in'   => [$post_id],
            'posts_per_page' => $count,
            'fields'         => 'ids',
            'no_found_rows'  => true,
            'post_type'      => 'post',
            'ignore_sticky_posts' => true,
            'meta_query'     => [
                [
                    'key'     => 'cyberseo_language',
                    'value'   => $language,
                    'compare' => '=',
                ],
                [
                    'key'     => '_thumbnail_id',
                    'compare' => 'EXISTS',
                ],
            ],
        ];

        if (!empty($categories)) {
            $args['category__in'] = $categories;
        }

        $related_ids = get_posts($args);

        if (count($related_ids) < $count) {
            $fallback_ids = get_posts([
                'post__not_in'            => array_merge([$post_id], $related_ids),
                'posts_per_page'          => $count - count($related_ids),
                'fields'                  => 'ids',
                'post_type'               => 'post',
                'ignore_sticky_posts'     => true,
                'no_found_rows'           => true,
                'orderby'                 => 'date',
                'order'                   => 'DESC',
                'meta_query'              => [
                    [
                        'key'     => 'cyberseo_language',
                        'value'   => $language,
                        'compare' => '=',
                    ],
                    [
                        'key'     => '_thumbnail_id',
                        'compare' => 'EXISTS',
                    ],
                ],
            ]);

            if (!empty($fallback_ids)) {
                $related_ids = array_values(array_unique(array_merge($related_ids, $fallback_ids)));
            }
        }
        
        // Cache for 12 hours
        set_transient($transient_key, $related_ids, 12 * HOUR_IN_SECONDS);
    }

    if (empty($related_ids)) {
        return [];
    }

    $posts = get_posts([
        'post__in'            => $related_ids,
        'posts_per_page'      => $count,
        'post_type'           => 'post',
        'ignore_sticky_posts' => true,
        'orderby'             => 'post__in',
    ]);

    $posts = array_values(array_filter($posts, static function (WP_Post $post): bool {
        return has_post_thumbnail($post);
    }));

    return array_slice($posts, 0, $count);
}

function comandos_render_related_post_thumb(WP_Post $post): void {
    if (!has_post_thumbnail($post)) {
        return;
    }

    echo get_the_post_thumbnail($post, 'comandos-thumb', [
        'class'         => 'related-thumb',
        'style'         => 'width: 100%; height: 100%; object-fit: cover;',
        'width'         => '500',
        'height'        => '281',
        'loading'       => 'lazy',
        'fetchpriority' => 'low',
        'alt'           => wp_strip_all_tags(get_the_title($post)),
    ]);
}
