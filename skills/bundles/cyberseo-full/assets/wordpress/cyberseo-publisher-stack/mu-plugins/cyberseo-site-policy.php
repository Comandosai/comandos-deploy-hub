<?php
/**
 * Plugin Name: CyberSEO Site Policy
 * Description: Enforces deterministic SEO archive policy, publish-ready SEO mode, and IndexNow keyfile serving for managed CyberSEO sites.
 * Version: 2026.04.11
 */

if (!defined('ABSPATH')) {
	exit;
}

const CYBERSEO_SITE_POLICY_VERSION = '2026.04.11';
const CYBERSEO_SITE_POLICY_OPTION = 'cyberseo_indexnow_key';
const CYBERSEO_SITE_POLICY_MODE_OPTION = 'cyberseo_publish_mode';
const CYBERSEO_SITE_POLICY_DEFAULT_BRAND_COLOR = '#c7f560';

function cyberseo_site_policy_generate_indexnow_key() {
	try {
		return strtolower(bin2hex(random_bytes(16)));
	} catch (Throwable $e) {
		return strtolower(wp_generate_password(32, false, false));
	}
}

function cyberseo_site_policy_can_touch_options() {
	if (!function_exists('is_blog_installed') || !is_blog_installed()) {
		return false;
	}

	global $wpdb;
	if (!isset($wpdb) || !($wpdb instanceof wpdb)) {
		return false;
	}

	$options_table = isset($wpdb->options) ? (string) $wpdb->options : '';
	if ($options_table === '') {
		return false;
	}

	$check = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $options_table));
	return $check === $options_table;
}

function cyberseo_site_policy_key() {
	if (!cyberseo_site_policy_can_touch_options()) {
		return '';
	}
	$key = get_option(CYBERSEO_SITE_POLICY_OPTION, '');
	return is_string($key) ? trim($key) : '';
}

function cyberseo_site_policy_ensure_indexnow_key() {
	if (!cyberseo_site_policy_can_touch_options()) {
		return '';
	}
	$key = cyberseo_site_policy_key();
	if ($key !== '') {
		return $key;
	}
	$key = cyberseo_site_policy_generate_indexnow_key();
	update_option(CYBERSEO_SITE_POLICY_OPTION, $key, false);
	return $key;
}

function cyberseo_site_policy_publish_mode() {
	if (!cyberseo_site_policy_can_touch_options()) {
		return 'publish-ready';
	}
	$mode = get_option(CYBERSEO_SITE_POLICY_MODE_OPTION, 'publish-ready');
	$mode = is_string($mode) ? trim($mode) : 'publish-ready';
	return $mode !== '' ? $mode : 'publish-ready';
}

function cyberseo_site_policy_is_publish_ready() {
	return cyberseo_site_policy_publish_mode() === 'publish-ready';
}

function cyberseo_site_policy_brand_color() {
	$raw = get_theme_mod('brand_color', CYBERSEO_SITE_POLICY_DEFAULT_BRAND_COLOR);
	$raw = is_string($raw) ? trim($raw) : CYBERSEO_SITE_POLICY_DEFAULT_BRAND_COLOR;
	return $raw !== '' ? $raw : CYBERSEO_SITE_POLICY_DEFAULT_BRAND_COLOR;
}

function cyberseo_site_policy_ensure_publish_ready() {
	if (!cyberseo_site_policy_can_touch_options()) {
		return;
	}
	cyberseo_site_policy_ensure_indexnow_key();
	if (!cyberseo_site_policy_is_publish_ready()) {
		return;
	}
	if ((string) get_option('blog_public', '1') !== '1') {
		update_option('blog_public', '1', false);
	}
}

function cyberseo_site_policy_article_canonical_ready() {
	$permalink_structure = (string) get_option('permalink_structure', '');
	return trim($permalink_structure) !== '';
}

function cyberseo_site_policy_should_print_canonical() {
	return !defined('WPSEO_VERSION') && !class_exists('WPSEO_Frontend');
}

function cyberseo_site_policy_state() {
	$key = cyberseo_site_policy_ensure_indexnow_key();
	$publish_mode = cyberseo_site_policy_publish_mode();

	return array(
		'plugin_ready' => true,
		'plugin_version' => CYBERSEO_SITE_POLICY_VERSION,
		'indexnow_key_configured' => $key !== '',
		'indexnow_keyfile_url' => $key !== '' ? home_url('/' . $key . '.txt') : '',
		'publish_mode' => $publish_mode,
		'public_indexing_enabled' => (string) get_option('blog_public', '1') === '1',
		'article_canonical_ready' => cyberseo_site_policy_article_canonical_ready(),
		'brand_color' => cyberseo_site_policy_brand_color(),
		'tag_archives_noindex' => true,
		'author_archives_noindex' => true,
		'date_archives_noindex' => true,
		'category_archives_indexable' => true,
		'tag_sitemap_excluded' => true,
		'author_sitemap_excluded' => true,
		'date_sitemap_excluded' => true,
	);
}

add_action('init', 'cyberseo_site_policy_ensure_publish_ready', 1);

add_action('parse_request', function ($wp) {
	$key = cyberseo_site_policy_ensure_indexnow_key();
	if ($key === '') {
		return;
	}

	$request_path = isset($wp->request) ? trim((string) $wp->request, '/') : '';
	if ($request_path !== $key . '.txt') {
		return;
	}

	status_header(200);
	nocache_headers();
	header('Content-Type: text/plain; charset=utf-8');
	echo $key;
	exit;
});

add_filter('wp_robots', function ($robots) {
	if (is_tag() || is_author() || is_date()) {
		$robots['noindex'] = true;
		$robots['follow'] = true;
		unset($robots['index']);
		return $robots;
	}

	if (cyberseo_site_policy_is_publish_ready() && is_singular()) {
		unset($robots['noindex']);
		unset($robots['nofollow']);
		$robots['index'] = true;
		$robots['follow'] = true;
	}

	return $robots;
});

add_filter('wpseo_robots', function ($robots) {
	if (is_tag() || is_author() || is_date()) {
		return 'noindex,follow';
	}

	if (cyberseo_site_policy_is_publish_ready() && is_singular()) {
		return 'index,follow';
	}

	return $robots;
});

add_action('wp_head', function () {
	if (!cyberseo_site_policy_should_print_canonical()) {
		return;
	}
	if (!cyberseo_site_policy_is_publish_ready() || !is_singular()) {
		return;
	}
	$canonical = get_permalink();
	if (!$canonical) {
		return;
	}
	echo '<link rel="canonical" href="' . esc_url($canonical) . "\" />\n";
}, 1);

add_filter('wp_sitemaps_taxonomies', function ($taxonomies) {
	if (isset($taxonomies['post_tag'])) {
		unset($taxonomies['post_tag']);
	}

	return $taxonomies;
});

add_filter('wp_sitemaps_add_provider', function ($provider, $name) {
	if ($name === 'users') {
		return false;
	}

	return $provider;
}, 10, 2);

add_filter('wpseo_sitemap_exclude_taxonomy', function ($exclude, $taxonomy) {
	if ($taxonomy === 'post_tag') {
		return true;
	}

	return $exclude;
}, 10, 2);

add_filter('wpseo_sitemap_exclude_author', '__return_true');

add_filter('wpseo_sitemap_index', function ($xml) {
	$patterns = array(
		'~\s*<sitemap>\s*<loc>[^<]*post_tag-sitemap[^<]*</loc>.*?</sitemap>\s*~is',
		'~\s*<sitemap>\s*<loc>[^<]*author-sitemap[^<]*</loc>.*?</sitemap>\s*~is',
		'~\s*<sitemap>\s*<loc>[^<]*date-sitemap[^<]*</loc>.*?</sitemap>\s*~is',
	);

	return preg_replace($patterns, '', $xml);
});

add_action('rest_api_init', function () {
	register_rest_route(
		'cyberseo/v1',
		'/site-policy',
		array(
			array(
				'methods' => WP_REST_Server::READABLE,
				'permission_callback' => function () {
					return current_user_can('manage_options');
				},
				'callback' => function () {
					return rest_ensure_response(cyberseo_site_policy_state());
				},
			),
			array(
				'methods' => WP_REST_Server::CREATABLE,
				'permission_callback' => function () {
					return current_user_can('manage_options');
				},
				'callback' => function (WP_REST_Request $request) {
					$key = sanitize_text_field((string) $request->get_param('indexnow_key'));
					$publish_mode = sanitize_text_field((string) $request->get_param('publish_mode'));

					if ($key !== '') {
						update_option(CYBERSEO_SITE_POLICY_OPTION, strtolower($key), false);
					}
					if ($publish_mode !== '') {
						update_option(CYBERSEO_SITE_POLICY_MODE_OPTION, $publish_mode, false);
					}

					cyberseo_site_policy_ensure_publish_ready();

					return rest_ensure_response(cyberseo_site_policy_state());
				},
				'args' => array(
					'indexnow_key' => array(
						'type' => 'string',
						'required' => false,
					),
					'publish_mode' => array(
						'type' => 'string',
						'required' => false,
					),
				),
			),
		)
	);
});
