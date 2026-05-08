<?php
/**
 * Plugin Name: CyberSEO Review Sync Hook
 * Description: Sends signed webhook events when managed draft posts are manually published.
 * Version: 2026.04.18
 */

if (!defined('ABSPATH')) {
	exit;
}

const CYBERSEO_REVIEW_SYNC_HOOK_VERSION = '2026.04.18';

function cyberseo_review_sync_hook_webhook_url() {
	$value = getenv('CYBERSEO_REVIEW_SYNC_WEBHOOK_URL');
	$value = is_string($value) ? trim($value) : '';
	return $value;
}

function cyberseo_review_sync_hook_secret() {
	$value = getenv('CYBERSEO_REVIEW_SYNC_SECRET');
	$value = is_string($value) ? trim($value) : '';
	return $value;
}

function cyberseo_review_sync_hook_signature($body, $secret) {
	return hash_hmac('sha256', $body, $secret);
}

function cyberseo_review_sync_hook_payload(WP_Post $post, $old_status, $new_status) {
	return array(
		'wordpress_post_id' => (int) $post->ID,
		'old_status' => is_string($old_status) ? $old_status : '',
		'new_status' => is_string($new_status) ? $new_status : '',
		'url' => get_permalink($post),
		'slug' => (string) $post->post_name,
		'title' => get_the_title($post),
		'modified_gmt' => get_post_modified_time('c', true, $post),
	);
}

add_action('transition_post_status', function ($new_status, $old_status, $post) {
	if (!($post instanceof WP_Post)) {
		return;
	}
	if ($post->post_type !== 'post') {
		return;
	}
	if ($new_status === $old_status) {
		return;
	}
	if ($new_status !== 'publish') {
		return;
	}

	$webhook_url = cyberseo_review_sync_hook_webhook_url();
	$secret = cyberseo_review_sync_hook_secret();
	if ($webhook_url === '' || $secret === '') {
		return;
	}

	$payload = cyberseo_review_sync_hook_payload($post, $old_status, $new_status);
	$body = wp_json_encode($payload);
	if (!is_string($body) || $body === '') {
		return;
	}

	wp_remote_post($webhook_url, array(
		'timeout' => 5,
		'blocking' => false,
		'headers' => array(
			'Content-Type' => 'application/json',
			'X-CyberSEO-Signature' => 'sha256=' . cyberseo_review_sync_hook_signature($body, $secret),
		),
		'body' => $body,
	));
}, 10, 3);
