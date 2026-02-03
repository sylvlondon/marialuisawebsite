module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets/cdn.prod.website-files.com": "cdn.prod.website-files.com" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/static": "static" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/build.txt": "build.txt" });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
    },
    templateFormats: ["html", "njk"],
  };
};
