module ApplicationHelper
	def base64_image file, id=nil
		if id
		  "<img src='data:image/jpeg;base64,#{file}' id='#{id}' />".html_safe
		else
		  "<img src='data:image/jpeg;base64,#{file}' />".html_safe
		end
	end
end
