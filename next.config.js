module.exports = {
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: 'https://cvu-portfolio.vercel.app/:path*',
        permanent: true,
      },
    ]
  },
}