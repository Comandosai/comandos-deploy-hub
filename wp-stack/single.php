<?php
get_header();
?>
<?php if (have_posts()) : ?>
  <?php while (have_posts()) : the_post(); ?>
    <article <?php post_class('single-post'); ?>>
      <div class="post-meta">
        <time datetime="<?php echo esc_attr(get_the_date(DATE_W3C)); ?>">
          <?php echo esc_html(get_the_date()); ?>
        </time>
      </div>
      <h1 class="post-title"><?php the_title(); ?></h1>
      <?php if (has_post_thumbnail()) : ?>
        <?php the_post_thumbnail('large', ['class' => 'single-thumb']); ?>
      <?php endif; ?>
      <div class="post-content">
        <?php the_content(); ?>
      </div>
      <a class="back-link" href="<?php echo esc_url(home_url('/')); ?>">← Назад к списку</a>
    </article>
  <?php endwhile; ?>
<?php else : ?>
  <div class="empty-state">
    Запись не найдена.
  </div>
<?php endif; ?>
<?php
get_footer();
