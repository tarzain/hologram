module ApplicationHelper
	def base64_image file
	  "<img src='data:image/jpeg;base64,#{file}' />".html_safe
	end
end
