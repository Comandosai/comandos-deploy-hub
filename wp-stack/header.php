<?php
/**
 * The Header for our theme.
 *
 * @package Comandos_Blog
 */
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
  /* Zero-CLS Hard Lock */
  .site-header { height: 70px !important; display: flex !important; align-items: center !important; }
  .header-custom-logo { width: 40px !important; height: 40px !important; }
  .post-hero {
      display: block !important;
      width: 100% !important;
      aspect-ratio: 1.46 / 1 !important;
      background: #f3f4f6 !important;
      margin-bottom: 30px !important;
  }
  body, h1, h2, h3, h4, h5, h6, p, li, a { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; 
  }
  </style>
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header class="site-header">
    <div class="site-inner header-main-wrapper">
      
      <?php get_template_part('template-parts/header/branding'); ?>
      
      <?php get_template_part('template-parts/header/navigation'); ?>
      
      <?php get_template_part('template-parts/header/search'); ?>

    </div>
  </header>

  <main class="site-main">
    <div class="site-inner">
