<?php
/**
 * Plugin Name: CyberSEO Site Policy
 * Description: Enforces deterministic SEO archive policy and IndexNow keyfile serving for managed CyberSEO sites.
 * Version: 2026.04.10
 */

if (!defined('ABSPATH')) {
	exit;
}

const CYBERSEO_SITE_POLICY_VERSION = '2026.04.10';
const CYBERSEO_SITE_POLICY_OPTION = 'cyberseo_indexnow_key';

function cyberseo_site_policy_key() {
	$key = get_option(CYBERSEO_SITE_POLICY_OPTION, '');
	return is_string($key) ? trim($key) : '';
}

function cyberseo_site_policy_state() {
	$key = cyberseo_site_policy_key();

	return array(
		'plugin_ready' => true,
		'plugin_version' => CYBERSEO_SITE_POLICY_VERSION,
		'indexnow_key_configured' => $key !== '',
		'indexnow_keyfile_url' => $key !== '' ? home_url('/' . $key . '.txt') : '',
		'tag_archives_noindex' => true,
		'author_archives_noindex' => true,
		'date_archives_noindex' => true,
		'category_archives_indexable' => true,
		'tag_sitemap_excluded' => true,
		'author_sitemap_excluded' => true,
		'date_sitemap_excluded' => true,
	);
}

add_action('parse_request', function ($wp) {
	$key = cyberseo_site_policy_key();
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
	}

	return $robots;
});

add_filter('wpseo_robots', function ($robots) {
	if (is_tag() || is_author() || is_date()) {
		return 'noindex,follow';
	}

	return $robots;
});

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
					if ($key !== '') {
						update_option(CYBERSEO_SITE_POLICY_OPTION, strtolower($key), false);
					}

					return rest_ensure_response(cyberseo_site_policy_state());
				},
				'args' => array(
					'indexnow_key' => array(
						'type' => 'string',
						'required' => false,
					),
				),
			),
		)
	);
});
